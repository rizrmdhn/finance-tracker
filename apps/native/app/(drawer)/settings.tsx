import {
	CURRENCY_LABELS,
	LANGUAGE_LABELS,
	SUPPORTED_CURRENCIES,
	SUPPORTED_LANGUAGES,
} from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
import { useMutation, useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";
import { createDownloadResumable } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ActivityIndicator,
	Alert,
	BackHandler,
	Platform,
	Switch,
	TouchableOpacity,
	View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Container } from "@/components/container";
import { THEME_OPTIONS } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import {
	ToggleGroup,
	ToggleGroupIcon,
	ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
	type ThemePreference,
	useAppTheme,
} from "@/contexts/app-theme-context";
import { useGithubRelease } from "@/hooks/use-github-release";
import { db, sqlite } from "@/lib/db";
import i18n from "@/lib/i18n";
import { useThemeColor } from "@/lib/theme";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

const GITHUB_REPO = "rizrmdhn/finance-tracker-mobile";

export default function Settings() {
	const { t } = useTranslation();
	const { theme, setTheme } = useAppTheme();
	const foreground = useThemeColor("foreground");
	const mutedForeground = useThemeColor("mutedForeground");
	const { data: currency } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);
	const { data: language } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);
	const { data: preReleaseSetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "pre_release" }),
	);

	const {
		data: release,
		isFetching: isCheckingUpdate,
		isError: isUpdateError,
		error: updateError,
		check: checkForUpdates,
	} = useGithubRelease(GITHUB_REPO, preReleaseSetting?.value === "true");

	const setSettingMutation = useMutation(
		trpc.appSetting.set.mutationOptions({
			onSuccess: async (_, variables) => {
				await queryClient.invalidateQueries(
					trpc.appSetting.get.queryOptions({ key: variables.key }),
				);
				globalSuccessToast(t("settings.toast.saved"));
			},
			onError: (error) => {
				globalErrorToast(
					t("settings.toast.saveFailed", { message: error.message }),
				);
			},
		}),
	);

	const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

	const downloadMutation = useMutation({
		mutationFn: async (downloadUrl: string) => {
			const destination = new Directory(Paths.cache, "apk");
			destination.create({ idempotent: true });
			const file = new File(destination, "update.apk");

			setDownloadProgress(0);
			if (file.exists) file.delete();
			const task = createDownloadResumable(
				downloadUrl,
				file.uri,
				{},
				(progress) => {
					if (progress.totalBytesExpectedToWrite > 0) {
						setDownloadProgress(
							progress.totalBytesWritten / progress.totalBytesExpectedToWrite,
						);
					}
				},
			);
			const result = await task.downloadAsync();
			if (!result) throw new Error("Download failed");

			if (Platform.OS === "android") {
				await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
					data: file.contentUri,
					flags: 1,
					type: "application/vnd.android.package-archive",
				});
			}
		},
		onSettled: () => setDownloadProgress(null),
		onError: (error) => {
			globalErrorToast(
				t("settings.toast.saveFailed", { message: error.message }),
			);
		},
	});

	const resetOnboardingMutation = useMutation(
		trpc.appSetting.set.mutationOptions({
			onSuccess: () => globalSuccessToast(t("settings.toast.onboardingReset")),
			onError: (error) => {
				globalErrorToast(
					t("settings.toast.onboardingResetFailed", { message: error.message }),
				);
			},
		}),
	);

	const backupMutation = useMutation({
		mutationFn: async () => {
			const directory = await Directory.pickDirectoryAsync();
			const snapshot = new File(Paths.cache, "finance-backup.db");
			if (snapshot.exists) snapshot.delete();
			// VACUUM INTO writes a consistent copy while the database stays open
			await sqlite.execute(
				`VACUUM INTO '${decodeURI(snapshot.uri.replace("file://", ""))}'`,
			);
			const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
			directory
				.createFile(`finance-backup-${stamp}.db`, "application/octet-stream")
				.write(await snapshot.bytes());
			snapshot.delete();
		},
		onSuccess: () => globalSuccessToast(t("settings.toast.backupSuccess")),
		onError: (error) => {
			if (isPickerCancelled(error)) return;
			globalErrorToast(
				t("settings.toast.backupFailed", { message: error.message }),
			);
		},
	});

	const restoreMutation = useMutation({
		mutationFn: async () => {
			const picked = await File.pickFileAsync();
			const bytes = await (Array.isArray(picked) ? picked[0] : picked).bytes();
			if (String.fromCharCode(...bytes.subarray(0, 15)) !== "SQLite format 3") {
				throw new Error(t("settings.dataManagement.invalidBackup"));
			}
			const dbFile = new File(`file://${sqlite.getDbPath()}`);
			sqlite.close();
			dbFile.write(bytes);
			for (const suffix of ["-wal", "-shm", "-journal"]) {
				const sidecar = new File(`${dbFile.uri}${suffix}`);
				if (sidecar.exists) sidecar.delete();
			}
		},
		onSuccess: () => {
			// The connection is closed — the app has to start fresh to load the restored file
			Alert.alert(
				t("settings.dataManagement.restoreDoneTitle"),
				t("settings.dataManagement.restoreDoneDescription"),
				[
					{
						text: t("settings.dataManagement.closeApp"),
						onPress: () => BackHandler.exitApp(),
					},
				],
				{ cancelable: false },
			);
		},
		onError: (error) => {
			if (isPickerCancelled(error)) return;
			globalErrorToast(
				t("settings.toast.restoreFailed", { message: error.message }),
			);
		},
	});

	const wipeMutation = useMutation({
		mutationFn: async () => {
			await db.delete(schema.transactions);
			await db.delete(schema.categories);
			await db.delete(schema.accounts);
			await db
				.update(schema.appSettings)
				.set({ value: "pending" })
				.where(eq(schema.appSettings.key, "onboarding"));
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries();
			globalSuccessToast(t("settings.toast.wipeSuccess"));
		},
		onError: (error) => {
			globalErrorToast(
				t("settings.toast.wipeFailed", { message: error.message }),
			);
		},
	});

	const [pendingConfirm, setPendingConfirm] = useState<
		"restore" | "wipe" | null
	>(null);

	const dataOpPending =
		backupMutation.isPending ||
		restoreMutation.isPending ||
		wipeMutation.isPending;

	return (
		<>
			<Container contentContainerClassName="w-full max-w-2xl self-center gap-6 p-4 pb-8">
				{/* Appearance */}
				<Section title={t("settings.appearance.title")}>
					<View className="gap-3">
						<View className="gap-0.5">
							<Text className="text-foreground text-sm">
								{t("settings.appearance.theme")}
							</Text>
							<Text className="text-muted-foreground text-xs">
								{t("settings.appearance.themeDescription")}
							</Text>
						</View>
						<ToggleGroup
							type="single"
							variant="outline"
							value={theme}
							onValueChange={(value) =>
								value && setTheme(value as ThemePreference)
							}
						>
							{THEME_OPTIONS.map(({ value, icon, labelKey }, index) => (
								<ToggleGroupItem
									key={value}
									value={value}
									isFirst={index === 0}
									isLast={index === THEME_OPTIONS.length - 1}
									className="flex-1"
								>
									<ToggleGroupIcon as={icon} />
									<Text>{t(labelKey)}</Text>
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					</View>
				</Section>

				<Separator />

				{/* Localization */}
				<Section title={t("settings.localization.title")}>
					<SettingRow
						stacked
						label={t("settings.localization.currency")}
						description={t("settings.localization.currencyDescription")}
					>
						<Select
							value={
								currency?.value
									? {
											value: currency.value,
											label:
												CURRENCY_LABELS[
													currency.value as keyof typeof CURRENCY_LABELS
												] ?? currency.value,
										}
									: undefined
							}
							onValueChange={(opt) =>
								opt &&
								setSettingMutation.mutate({ key: "currency", value: opt.value })
							}
						>
							<SelectTrigger className="w-full sm:w-56">
								<SelectValue placeholder="IDR" />
							</SelectTrigger>
							<SelectContent>
								{SUPPORTED_CURRENCIES.map((c) => (
									<SelectItem key={c} value={c} label={CURRENCY_LABELS[c]} />
								))}
							</SelectContent>
						</Select>
					</SettingRow>

					<SettingRow
						stacked
						label={t("settings.localization.language")}
						description={t("settings.localization.languageDescription")}
					>
						<Select
							value={
								language?.value
									? {
											value: language.value,
											label:
												LANGUAGE_LABELS[
													language.value as keyof typeof LANGUAGE_LABELS
												] ?? language.value,
										}
									: undefined
							}
							onValueChange={(opt) => {
								if (opt) {
									setSettingMutation.mutate({
										key: "language",
										value: opt.value,
									});
									i18n.changeLanguage(opt.value);
								}
							}}
						>
							<SelectTrigger className="w-full sm:w-56">
								<SelectValue placeholder="Bahasa Indonesia" />
							</SelectTrigger>
							<SelectContent>
								{SUPPORTED_LANGUAGES.map((lang) => (
									<SelectItem
										key={lang}
										value={lang}
										label={LANGUAGE_LABELS[lang]}
									/>
								))}
							</SelectContent>
						</Select>
					</SettingRow>
				</Section>

				<Separator />

				{/* Updates */}
				<Section title={t("settings.advanced.title")}>
					<SettingRow
						label={t("settings.advanced.updates")}
						description={t("settings.advanced.updatesDescription")}
					>
						<TouchableOpacity
							onPress={() => checkForUpdates()}
							disabled={isCheckingUpdate}
							className="rounded-lg border border-border px-3 py-2"
						>
							{isCheckingUpdate ? (
								<ActivityIndicator size="small" />
							) : (
								<Text className="text-sm">
									{t("settings.advanced.checkUpdates")}
								</Text>
							)}
						</TouchableOpacity>
					</SettingRow>

					{release?.isUpToDate && (
						<Text className="text-muted-foreground text-xs">
							{t("settings.advanced.upToDate")}
						</Text>
					)}

					{isUpdateError && (
						<Text className="text-destructive text-xs">
							{t("settings.advanced.failedToCheck", {
								message: updateError?.message,
							})}
						</Text>
					)}

					{release && !release.isUpToDate && (
						<View className="gap-3 rounded-lg border border-border p-3">
							<Text className="font-medium text-sm">
								{t("settings.advanced.versionAvailable", {
									version: release.version,
								})}
							</Text>
							{release.body && (
								<Markdown
									style={{
										body: { color: mutedForeground, fontSize: 12 },
										heading1: { color: foreground, fontSize: 14 },
										heading2: { color: foreground, fontSize: 13 },
										heading3: { color: foreground, fontSize: 12 },
										code_inline: { color: foreground },
										fence: { color: foreground },
									}}
								>
									{release.body}
								</Markdown>
							)}
							<TouchableOpacity
								onPress={() => downloadMutation.mutate(release.downloadUrl)}
								disabled={downloadProgress !== null}
								className="overflow-hidden rounded-lg bg-foreground"
							>
								{downloadProgress !== null && (
									<View
										className="absolute inset-0 bg-muted-foreground/30"
										style={{ width: `${Math.round(downloadProgress * 100)}%` }}
									/>
								)}
								<View className="items-center px-3 py-2">
									<Text className="font-medium text-background text-sm">
										{downloadProgress !== null
											? `${t("settings.advanced.downloading")} ${Math.round(downloadProgress * 100)}%`
											: t("settings.advanced.downloadApk")}
									</Text>
								</View>
							</TouchableOpacity>
						</View>
					)}

					<SettingRow
						label={t("settings.advanced.preRelease")}
						description={t("settings.advanced.preReleaseDescription")}
					>
						<Switch
							value={preReleaseSetting?.value === "true"}
							onValueChange={(val) => {
								setSettingMutation.mutate({
									key: "pre_release",
									value: val ? "true" : "false",
								});
							}}
						/>
					</SettingRow>

					<SettingRow
						label={t("settings.advanced.resetOnboarding")}
						description={t("settings.advanced.resetOnboardingDescription")}
					>
						<Button
							variant="outline"
							size="sm"
							disabled={resetOnboardingMutation.isPending}
							onPress={() =>
								resetOnboardingMutation.mutate({
									key: "onboarding",
									value: "pending",
								})
							}
						>
							<Text>{t("common.reset")}</Text>
						</Button>
					</SettingRow>
				</Section>

				<Separator />

				{/* Data Management */}
				<Section title={t("settings.dataManagement.title")}>
					<SettingRow
						stacked
						label={t("settings.dataManagement.backup")}
						description={t("settings.dataManagement.backupDescription")}
					>
						<Button
							variant="outline"
							size="sm"
							className="self-start sm:self-auto"
							disabled={dataOpPending}
							onPress={() => backupMutation.mutate()}
						>
							{backupMutation.isPending && <ActivityIndicator size="small" />}
							<Text>{t("settings.dataManagement.backup")}</Text>
						</Button>
					</SettingRow>

					<SettingRow
						stacked
						label={t("settings.dataManagement.restore")}
						description={t("settings.dataManagement.restoreDescription")}
					>
						<Button
							variant="outline"
							size="sm"
							className="self-start sm:self-auto"
							disabled={dataOpPending}
							onPress={() => setPendingConfirm("restore")}
						>
							<Text>{t("settings.dataManagement.restore")}</Text>
						</Button>
					</SettingRow>

					<SettingRow
						stacked
						label={t("settings.dataManagement.wipe")}
						description={t("settings.dataManagement.wipeDescription")}
					>
						<Button
							variant="destructive"
							size="sm"
							className="self-start sm:self-auto"
							disabled={dataOpPending}
							onPress={() => setPendingConfirm("wipe")}
						>
							<Text>{t("settings.dataManagement.wipe")}</Text>
						</Button>
					</SettingRow>
				</Section>

				{Constants.expoConfig?.version && (
					<>
						<Separator />
						<Text className="text-muted-foreground text-xs">
							Finance Tracker v{Constants.expoConfig.version}
						</Text>
					</>
				)}
			</Container>

			{/* Outside the layout: the dialog root renders a View that would take up a gap slot */}
			<ConfirmationDialog
				open={pendingConfirm === "restore"}
				onOpenChange={(open) => !open && setPendingConfirm(null)}
				title={t("settings.dataManagement.restoreConfirmTitle")}
				description={t("settings.dataManagement.restoreConfirmDescription")}
				confirmText={t("settings.dataManagement.restore")}
				variant="destructive"
				isLoading={restoreMutation.isPending}
				onConfirm={() => restoreMutation.mutate()}
			/>
			<ConfirmationDialog
				open={pendingConfirm === "wipe"}
				onOpenChange={(open) => !open && setPendingConfirm(null)}
				title={t("settings.dataManagement.wipeConfirmTitle")}
				description={t("settings.dataManagement.wipeConfirmDescription")}
				confirmText={t("settings.dataManagement.wipeConfirmAction")}
				variant="destructive"
				isLoading={wipeMutation.isPending}
				onConfirm={() => wipeMutation.mutate()}
			/>
		</>
	);
}

/** Pickers reject with ERR_PICKER_CANCELLED (Android) / ERR_FILE_PICKING_CANCELLED (iOS) */
function isPickerCancelled(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string" &&
		error.code.endsWith("_CANCELLED")
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<View className="gap-4">
			<Text className="font-medium text-muted-foreground text-sm">{title}</Text>
			{children}
		</View>
	);
}

function SettingRow({
	label,
	description,
	stacked = false,
	children,
}: {
	label: string;
	description: string;
	/** Put the control below the text on phone widths, for controls too wide to sit beside it */
	stacked?: boolean;
	children: React.ReactNode;
}) {
	return (
		<View
			className={
				stacked
					? "gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
					: "flex-row items-center justify-between gap-4"
			}
		>
			{/* No flex-1 while stacked: flex-basis 0 collapses the text in an auto-height column */}
			<View className={stacked ? "gap-0.5 sm:flex-1" : "flex-1 gap-0.5"}>
				<Text className="text-foreground text-sm">{label}</Text>
				<Text className="text-muted-foreground text-xs">{description}</Text>
			</View>
			{children}
		</View>
	);
}
