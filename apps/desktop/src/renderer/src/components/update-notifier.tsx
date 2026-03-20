import { useEffect } from "react";
import { toast } from "sonner"; // already in your deps

declare global {
	interface Window {
		updater: {
			onUpdateDownloaded: (callback: () => void) => void;
			installUpdate: () => void;
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
	}, []);

	return null;
}
