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
import {
	CURRENCY_LABELS,
	LANGUAGE_LABELS,
	SUPPORTED_CURRENCIES,
	SUPPORTED_LANGUAGES,
} from "@finance-tracker/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

type UpdateStatus =
	| { state: "idle" }
	| { state: "checking" }
	| { state: "up-to-date" }
	| { state: "available"; version: string; releaseNotes: string | null }
	| { state: "downloading"; version: string; releaseNotes: string | null; percent: number }
	| { state: "downloaded" };

function RouteComponent() {
	const { theme, setTheme } = useTheme();
	const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });
	const listenersAttached = useRef(false);

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

	useEffect(() => {
		if (listenersAttached.current || !window.updater) return;
		listenersAttached.current = true;

		window.updater.onUpdateAvailable((info) => {
			setUpdateStatus({
				state: "available",
				version: info.version,
				releaseNotes: info.releaseNotes,
			});
		});

		window.updater.onUpdateNotAvailable(() => {
			setUpdateStatus({ state: "up-to-date" });
		});

		window.updater.onDownloadProgress((progress) => {
			setUpdateStatus((prev) => ({
				state: "downloading",
				version: prev.state === "available" || prev.state === "downloading" ? prev.version : "",
				releaseNotes: prev.state === "available" || prev.state === "downloading" ? prev.releaseNotes : null,
				percent: progress.percent,
			}));
		});

		window.updater.onUpdateDownloaded(() => {
			setUpdateStatus({ state: "downloaded" });
		});

		return () => {
			window.updater?.removeAllListeners("update-available");
			window.updater?.removeAllListeners("update-not-available");
			window.updater?.removeAllListeners("download-progress");
			window.updater?.removeAllListeners("update-downloaded");
		};
	}, []);

	function handleCheckForUpdates() {
		setUpdateStatus({ state: "checking" });
		window.updater?.checkForUpdates();
	}

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
					<Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
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

				<SettingRow label="Bahasa" description="Bahasa tampilan aplikasi">
					<Select
						value={language?.value ?? "id"}
						onValueChange={(v) =>
							v && setSettingMutation.mutate({ key: "language", value: v })
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
					label="Pembaruan Aplikasi"
					description="Periksa apakah ada versi terbaru"
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
						Cek Pembaruan
					</Button>
				</SettingRow>

				{updateStatus.state === "up-to-date" && (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<CheckCircle2 className="size-4 text-green-500" />
						Aplikasi sudah versi terbaru
					</div>
				)}

				{(updateStatus.state === "available" ||
					updateStatus.state === "downloading" ||
					updateStatus.state === "downloaded") && (
					<div className="flex flex-col gap-3 rounded-lg border p-4">
						{updateStatus.state !== "downloaded" && (
							<p className="font-medium text-sm">
								Versi {updateStatus.version} tersedia
							</p>
						)}

						{updateStatus.state !== "downloaded" && updateStatus.releaseNotes && (
							<div
								className="prose prose-sm dark:prose-invert max-h-48 overflow-y-auto text-muted-foreground text-xs"
								dangerouslySetInnerHTML={{ __html: updateStatus.releaseNotes }}
							/>
						)}

						{updateStatus.state === "available" && (
							<p className="text-muted-foreground text-xs">
								Pembaruan akan diunduh secara otomatis.
							</p>
						)}

						{updateStatus.state === "downloading" && (
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<ProgressLabel>Mengunduh pembaruan...</ProgressLabel>
									<span className="text-muted-foreground text-xs tabular-nums">
									{updateStatus.percent}%
								</span>
								</div>
								<Progress value={updateStatus.percent} />
							</div>
						)}

						{updateStatus.state === "downloaded" && (
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm">
									<CheckCircle2 className="size-4 text-green-500" />
									Siap dipasang
								</div>
								<Button size="sm" onClick={() => window.updater?.installUpdate()}>
									Restart &amp; Pasang
								</Button>
							</div>
						)}
					</div>
				)}

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
