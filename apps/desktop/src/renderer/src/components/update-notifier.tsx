import { useEffect } from "react";
import { toast } from "sonner";

declare global {
	interface Window {
		updater: {
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
			installUpdate: () => void;
			removeAllListeners: (channel: string) => void;
		};
	}
}

export function UpdateNotifier() {
	useEffect(() => {
		window.updater?.onUpdateDownloaded(() => {
			toast("Update ready", {
				description: "A new version has been downloaded.",
				action: {
					label: "Restart & Install",
					onClick: () => window.updater.installUpdate(),
				},
				duration: Number.POSITIVE_INFINITY,
			});
		});

		return () => {
			window.updater?.removeAllListeners("update-downloaded");
		};
	}, []);

	return null;
}
