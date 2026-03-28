import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

declare global {
	interface Window {
		electronUpdater: {
			checkForUpdates: () => void;
			onUpdateAvailable: (
				callback: (info: {
					version: string;
					releaseNotes: string | null;
				}) => void,
			) => void;
			onUpdateNotAvailable: (callback: () => void) => void;
			onDownloadProgress: (
				callback: (progress: {
					percent: number;
					transferred: number;
					total: number;
				}) => void,
			) => void;
			onUpdateDownloaded: (callback: () => void) => void;
			onUpdateError: (callback: (message: string) => void) => void;
			installUpdate: () => void;
			setAllowPrerelease: (allow: boolean) => Promise<void>;
			removeAllListeners: (channel: string) => void;
		};
	}
}

export function UpdateNotifier() {
	const { t } = useTranslation();

	useEffect(() => {
		window.electronUpdater?.onUpdateDownloaded(() => {
			toast(t("update.toast.title"), {
				description: t("update.toast.description"),
				action: {
					label: t("update.toast.action"),
					onClick: () => window.electronUpdater.installUpdate(),
				},
				duration: Number.POSITIVE_INFINITY,
			});
		});

		return () => {
			window.electronUpdater?.removeAllListeners("update-downloaded");
		};
	}, [t]);

	return null;
}
