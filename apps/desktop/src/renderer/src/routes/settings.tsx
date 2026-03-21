import { Button } from "@finance-tracker/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { Separator } from "@finance-tracker/ui/components/separator";
import {
	CURRENCY_LABELS,
	LANGUAGE_LABELS,
	SUPPORTED_CURRENCIES,
	SUPPORTED_LANGUAGES,
} from "@finance-tracker/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "@/components/theme-provider";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

export const Route = createFileRoute("/settings")({
	component: RouteComponent,
	head: () =>
		pageHead("Pengaturan", "Kelola preferensi aplikasi Finance Tracker."),
});

const THEME_OPTIONS = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "System" },
];

function RouteComponent() {
	const { theme, setTheme } = useTheme();

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
				globalSuccessToast("Pengaturan berhasil disimpan");
			},
			onError: (error) => {
				globalErrorToast(`Gagal menyimpan pengaturan: ${error.message}`);
			},
		}),
	);

	const resetOnboardingMutation = useMutation(
		trpc.appSetting.set.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.appSetting.get.queryOptions({ key: "onboarding" }),
				);
				globalSuccessToast("Onboarding berhasil direset");
			},
			onError: (error) => {
				globalErrorToast(`Gagal mereset onboarding: ${error.message}`);
			},
		}),
	);

	return (
		<div className="flex max-w-xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-xl">Pengaturan</h1>
				<p className="text-muted-foreground text-sm">
					Kelola preferensi aplikasi Anda
				</p>
			</div>

			<Separator />

			{/* Appearance */}
			<section className="flex flex-col gap-4">
				<h2 className="font-medium text-sm">Tampilan</h2>
				<SettingRow label="Tema" description="Pilih tema tampilan aplikasi">
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
				<h2 className="font-medium text-sm">Lokalisasi</h2>
				<SettingRow
					label="Mata Uang"
					description="Mata uang default untuk tampilan saldo"
				>
					<Select
						value={currency?.value ?? "IDR"}
						onValueChange={(v) =>
							setSettingMutation.mutate({ key: "currency", value: v as string })
						}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SUPPORTED_CURRENCIES.map((currency) => (
								<SelectItem key={currency} value={currency}>
									{CURRENCY_LABELS[currency]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>

				<SettingRow label="Bahasa" description="Bahasa tampilan aplikasi">
					<Select
						value={language?.value ?? "id"}
						onValueChange={(v) =>
							setSettingMutation.mutate({ key: "language", value: v as string })
						}
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
				<h2 className="font-medium text-sm">Lanjutan</h2>
				<SettingRow
					label="Reset Onboarding"
					description="Tampilkan kembali layar onboarding saat aplikasi dibuka"
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
						Reset Onboarding
					</Button>
				</SettingRow>
			</section>
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
