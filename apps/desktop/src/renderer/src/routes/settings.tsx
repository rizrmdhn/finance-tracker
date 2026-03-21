import {
	CURRENCY_LABELS,
	LANGUAGE_LABELS,
	SUPPORTED_CURRENCIES,
	SUPPORTED_LANGUAGES,
} from "@finance-tracker/constants";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Progress,
	ProgressLabel,
} from "@finance-tracker/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { Separator } from "@finance-tracker/ui/components/separator";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useTheme } from "@/components/theme-provider";
import { useOptimisticMutation } from "@/lib/optimistic-update";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

declare global {
	interface Window {
		electronApp: {
			getVersion: () => Promise<string>;
		};
		electronDataManager: {
			backup: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				error?: string;
			}>;
			restore: () => Promise<{
				success: boolean;
				cancelled?: boolean;
				error?: string;
			}>;
			wipe: () => Promise<{ success: boolean; error?: string }>;
		};
	}
}

export const Route = createFileRoute("/settings")({
	component: RouteComponent,
	head: () => pageHead("Settings", "Manage your Finance Tracker preferences."),
});

type UpdateStatus =
	| { state: "idle" }
	| { state: "checking" }
	| { state: "up-to-date" }
	| { state: "error"; message: string }
	| { state: "available"; version: string; releaseNotes: string | null }
	| {
			state: "downloading";
			version: string;
			releaseNotes: string | null;
			percent: number;
	  }
	| { state: "downloaded" };

function RouteComponent() {
	const { t, i18n } = useTranslation();
	const { theme, setTheme } = useTheme();
	const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
		state: "idle",
	});
	const [dataOpPending, setDataOpPending] = useState<
		"backup" | "restore" | "wipe" | null
	>(null);
	const [appVersion, setAppVersion] = useState<string | null>(null);

	const THEME_OPTIONS = [
		{ value: "light", label: t("settings.appearance.light") },
		{ value: "dark", label: t("settings.appearance.dark") },
		{ value: "system", label: t("settings.appearance.system") },
	];

	const { data: currency } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);

	const { data: language } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);

	const setSettingMutation = useOptimisticMutation(
		trpc.appSetting.set.mutationOptions(),
		{
			queryOptions: (variables) =>
				trpc.appSetting.get.queryOptions({ key: variables.key }), // This will be overridden in the mutationFn, but we need it here for the optimistic update
			operation: {
				type: "update",
				getId: (variables) => variables.key,
				getUpdatedFields: (variables) => ({ value: variables.value }),
			},
			onSuccess: () => {
				globalSuccessToast(t("settings.toast.saved"));
			},
			onError: (error) => {
				globalErrorToast(
					t("settings.toast.saveFailed", { message: error.message }),
				);
			},
		},
	);

	const resetOnboardingMutation = useOptimisticMutation(
		trpc.appSetting.set.mutationOptions(),
		{
			queryOptions: () =>
				trpc.appSetting.get.queryOptions({ key: "onboarding" }), // This will be overridden in the mutationFn, but we need it here for the optimistic update
			operation: {
				type: "update",
				getId: () => "onboarding",
				getUpdatedFields: () => ({ value: "pending" }),
			},
			onSuccess: () => {
				globalSuccessToast(t("settings.toast.onboardingReset"));
			},
			onError: (error) => {
				globalErrorToast(
					t("settings.toast.onboardingResetFailed", { message: error.message }),
				);
			},
		},
	);

	useEffect(() => {
		window.electronApp?.getVersion().then(setAppVersion);
	}, []);

	useEffect(() => {
		if (!window.electronUpdater) return;

		window.electronUpdater.onUpdateAvailable((info) => {
			setUpdateStatus({
				state: "available",
				version: info.version,
				releaseNotes: info.releaseNotes,
			});
		});

		window.electronUpdater.onUpdateNotAvailable(() => {
			setUpdateStatus({ state: "up-to-date" });
		});

		window.electronUpdater.onUpdateError((message) => {
			setUpdateStatus({ state: "error", message });
		});

		window.electronUpdater.onDownloadProgress((progress) => {
			setUpdateStatus((prev) => ({
				state: "downloading",
				version:
					prev.state === "available" || prev.state === "downloading"
						? prev.version
						: "",
				releaseNotes:
					prev.state === "available" || prev.state === "downloading"
						? prev.releaseNotes
						: null,
				percent: progress.percent,
			}));
		});

		window.electronUpdater.onUpdateDownloaded(() => {
			setUpdateStatus({ state: "downloaded" });
		});

		return () => {
			window.electronUpdater?.removeAllListeners("update-available");
			window.electronUpdater?.removeAllListeners("update-not-available");
			window.electronUpdater?.removeAllListeners("download-progress");
			window.electronUpdater?.removeAllListeners("update-downloaded");
			window.electronUpdater?.removeAllListeners("update-error");
		};
	}, []);

	function handleCheckForUpdates() {
		setUpdateStatus({ state: "checking" });
		window.electronUpdater?.checkForUpdates();
	}

	async function handleBackup() {
		setDataOpPending("backup");
		try {
			const result = await window.electronDataManager.backup();
			if (result.cancelled) return;
			if (result.success) {
				globalSuccessToast(t("settings.toast.backupSuccess"));
			} else {
				globalErrorToast(
					t("settings.toast.backupFailed", { message: result.error }),
				);
			}
		} finally {
			setDataOpPending(null);
		}
	}

	async function handleRestore() {
		setDataOpPending("restore");
		try {
			const result = await window.electronDataManager.restore();
			if (result.cancelled) return;
			if (result.success) {
				globalSuccessToast(t("settings.toast.restoreSuccess"));
			} else {
				globalErrorToast(
					t("settings.toast.restoreFailed", { message: result.error }),
				);
			}
		} finally {
			setDataOpPending(null);
		}
	}

	async function handleWipe() {
		setDataOpPending("wipe");
		try {
			const result = await window.electronDataManager.wipe();
			if (result.success) {
				await queryClient.invalidateQueries();
				globalSuccessToast(t("settings.toast.wipeSuccess"));
			} else {
				globalErrorToast(
					t("settings.toast.wipeFailed", { message: result.error }),
				);
			}
		} finally {
			setDataOpPending(null);
		}
	}

	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-xl">{t("settings.heading")}</h1>
				<p className="text-muted-foreground text-sm">
					{t("settings.subheading")}
				</p>
			</div>

			<Separator />

			{/* Appearance */}
			<section className="flex flex-col gap-4">
				<h2 className="font-medium text-sm">
					{t("settings.appearance.title")}
				</h2>
				<SettingRow
					label={t("settings.appearance.theme")}
					description={t("settings.appearance.themeDescription")}
				>
					<Select
						value={theme}
						onValueChange={(v) => setTheme(v as typeof theme)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{THEME_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>
			</section>

			<Separator />

			{/* Localization */}
			<section className="flex flex-col gap-4">
				<h2 className="font-medium text-sm">
					{t("settings.localization.title")}
				</h2>
				<SettingRow
					label={t("settings.localization.currency")}
					description={t("settings.localization.currencyDescription")}
				>
					<Select
						value={currency?.value ?? "IDR"}
						onValueChange={(v) =>
							v && setSettingMutation.mutate({ key: "currency", value: v })
						}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SUPPORTED_CURRENCIES.map((c) => (
								<SelectItem key={c} value={c}>
									{CURRENCY_LABELS[c]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>

				<SettingRow
					label={t("settings.localization.language")}
					description={t("settings.localization.languageDescription")}
				>
					<Select
						value={language?.value ?? "id"}
						onValueChange={(v) => {
							if (v) {
								setSettingMutation.mutate({ key: "language", value: v });
								i18n.changeLanguage(v);
							}
						}}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SUPPORTED_LANGUAGES.map((lang) => (
								<SelectItem key={lang} value={lang}>
									{LANGUAGE_LABELS[lang]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>
			</section>

			<Separator />

			{/* Advanced */}
			<section className="flex flex-col gap-4">
				<h2 className="font-medium text-sm">{t("settings.advanced.title")}</h2>

				<SettingRow
					label={t("settings.advanced.updates")}
					description={t("settings.advanced.updatesDescription")}
				>
					<Button
						variant="outline"
						onClick={handleCheckForUpdates}
						disabled={
							updateStatus.state === "checking" ||
							updateStatus.state === "downloading" ||
							updateStatus.state === "downloaded"
						}
					>
						{updateStatus.state === "checking" ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<RefreshCw className="size-4" />
						)}
						{t("settings.advanced.checkUpdates")}
					</Button>
				</SettingRow>

				{updateStatus.state === "up-to-date" && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<CheckCircle2 className="size-4 text-green-500" />
						{t("settings.advanced.upToDate")}
					</div>
				)}

				{updateStatus.state === "error" && (
					<div className="flex items-center gap-2 text-destructive text-sm">
						<AlertCircle className="size-4" />
						{t("settings.advanced.failedToCheck", {
							message: updateStatus.message,
						})}
					</div>
				)}

				{(updateStatus.state === "available" ||
					updateStatus.state === "downloading" ||
					updateStatus.state === "downloaded") && (
					<div className="flex flex-col gap-3 rounded-lg border p-4">
						{updateStatus.state !== "downloaded" && (
							<p className="font-medium text-sm">
								{t("settings.advanced.versionAvailable", {
									version: updateStatus.version,
								})}
							</p>
						)}

						{updateStatus.state !== "downloaded" &&
							updateStatus.releaseNotes && (
								<div
									className="prose prose-sm dark:prose-invert max-h-48 overflow-y-auto text-muted-foreground text-xs"
									dangerouslySetInnerHTML={{
										__html: updateStatus.releaseNotes,
									}}
								/>
							)}

						{updateStatus.state === "available" && (
							<p className="text-muted-foreground text-xs">
								{t("settings.advanced.downloadingAuto")}
							</p>
						)}

						{updateStatus.state === "downloading" && (
							<Progress
								value={updateStatus.percent}
								className="flex-col gap-1.5"
							>
								<div className="flex w-full items-center justify-between">
									<ProgressLabel>
										{t("settings.advanced.downloading")}
									</ProgressLabel>
									<span className="text-muted-foreground text-xs tabular-nums">
										{updateStatus.percent}%
									</span>
								</div>
							</Progress>
						)}

						{updateStatus.state === "downloaded" && (
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm">
									<CheckCircle2 className="size-4 text-green-500" />
									{t("settings.advanced.readyToInstall")}
								</div>
								<Button
									size="sm"
									onClick={() => window.electronUpdater?.installUpdate()}
								>
									{t("settings.advanced.restartInstall")}
								</Button>
							</div>
						)}
					</div>
				)}

				<SettingRow
					label={t("settings.advanced.resetOnboarding")}
					description={t("settings.advanced.resetOnboardingDescription")}
				>
					<Button
						variant="outline"
						onClick={() =>
							resetOnboardingMutation.mutate({
								key: "onboarding",
								value: "pending",
							})
						}
						disabled={resetOnboardingMutation.isPending}
					>
						{t("settings.advanced.resetOnboarding")}
					</Button>
				</SettingRow>
			</section>

			<Separator />

			{/* Data Management */}
			<section className="flex flex-col gap-4">
				<h2 className="font-medium text-sm">
					{t("settings.dataManagement.title")}
				</h2>

				<SettingRow
					label={t("settings.dataManagement.backup")}
					description={t("settings.dataManagement.backupDescription")}
				>
					<Button
						variant="outline"
						onClick={handleBackup}
						disabled={dataOpPending !== null}
					>
						{dataOpPending === "backup" && (
							<Loader2 className="size-4 animate-spin" />
						)}
						{t("settings.dataManagement.backup")}
					</Button>
				</SettingRow>

				<SettingRow
					label={t("settings.dataManagement.restore")}
					description={t("settings.dataManagement.restoreDescription")}
				>
					<Button
						variant="outline"
						onClick={handleRestore}
						disabled={dataOpPending !== null}
					>
						{dataOpPending === "restore" && (
							<Loader2 className="size-4 animate-spin" />
						)}
						{t("settings.dataManagement.restore")}
					</Button>
				</SettingRow>

				<SettingRow
					label={t("settings.dataManagement.wipe")}
					description={t("settings.dataManagement.wipeDescription")}
				>
					<ConfirmationDialog
						trigger={t("settings.dataManagement.wipe")}
						title={t("settings.dataManagement.wipeConfirmTitle")}
						description={t("settings.dataManagement.wipeConfirmDescription")}
						confirmText={t("settings.dataManagement.wipeConfirmAction")}
						variant="destructive"
						isLoading={dataOpPending === "wipe"}
						onConfirm={handleWipe}
					/>
				</SettingRow>
			</section>

			{appVersion && (
				<>
					<Separator />
					<p className="text-muted-foreground text-xs">
						Finance Tracker v{appVersion}
					</p>
				</>
			)}
		</div>
	);
}

function SettingRow({
	label,
	description,
	children,
}: {
	label: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex flex-col gap-0.5">
				<span className="text-sm">{label}</span>
				<span className="text-muted-foreground text-xs">{description}</span>
			</div>
			{children}
		</div>
	);
}
