import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { platform } from "@/platform";

export function UpdateNotifier() {
	const { t } = useTranslation();

	useEffect(() => {
		if (!platform.updater.isSupported) return;

		platform.updater.onUpdateDownloaded(() => {
			toast(t("update.toast.title"), {
				description: t("update.toast.description"),
				action: {
					label: t("update.toast.action"),
					onClick: () => platform.updater.installUpdate(),
				},
				duration: Number.POSITIVE_INFINITY,
			});
		});

		return () => {
			platform.updater.removeAllListeners("update-downloaded");
		};
	}, [t]);

	return null;
}
