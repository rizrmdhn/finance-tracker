import {
	CURRENCY_LABELS,
	LANGUAGE_LABELS,
	SUPPORTED_CURRENCIES,
	SUPPORTED_LANGUAGES,
} from "@finance-tracker/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import {
	ActivityIndicator,
	Switch,
	TouchableOpacity,
	View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { Container } from "@/components/container";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useGithubRelease } from "@/hooks/use-github-release";
import i18n from "@/lib/i18n";
import { useThemeColor } from "@/lib/theme";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

// Replace with your actual GitHub repo (e.g. "username/finance-tracker")
const GITHUB_REPO = "rizrmdhn/finance-tracker";

export default function Settings() {
	const { t } = useTranslation();
	const { isDark, setTheme } = useAppTheme();
	const foreground = useThemeColor("foreground");
	const mutedForeground = useThemeColor("mutedForeground");
	const {
		data: release,
		isFetching: isCheckingUpdate,
		isError: isUpdateError,
		error: updateError,
		check: checkForUpdates,
	} = useGithubRelease(GITHUB_REPO);

	const { data: currency } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);
	const { data: language } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);

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

	return (
		<Container contentContainerClassName="gap-6 p-4 pb-8">
			{/* Appearance */}
			<Section title={t("settings.appearance.title")}>
				<SettingRow
					label={t("settings.appearance.theme")}
					description={t("settings.appearance.themeDescription")}
				>
					<Switch
						value={isDark}
						onValueChange={(v) => setTheme(v ? "dark" : "light")}
					/>
				</SettingRow>
			</Section>

			<Separator />

			{/* Localization */}
			<Section title={t("settings.localization.title")}>
				<SettingRow
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
						<SelectTrigger className="w-36">
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
						<SelectTrigger className="w-36">
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
							onPress={() => Linking.openURL(release.downloadUrl)}
							className="items-center rounded-lg bg-foreground px-3 py-2"
						>
							<Text className="font-medium text-background text-sm">
								Download APK
							</Text>
						</TouchableOpacity>
					</View>
				)}
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
	children,
}: {
	label: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<View className="flex-row items-center justify-between gap-4">
			<View className="flex-1 gap-0.5">
				<Text className="text-foreground text-sm">{label}</Text>
				<Text className="text-muted-foreground text-xs">{description}</Text>
			</View>
			{children}
		</View>
	);
}
