import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { platform } from "@/platform";

export function UpdateNotifier() {
	const { t } = useTranslation();

	useEffect(() => {
		if (!platform.updater.isSupported) return;

		return platform.updater.onStatus((status) => {
			// Fixed ids: a repeated status updates the open toast instead of stacking a new one
			if (status.state === "downloaded") {
				toast(t("update.toast.title"), {
					id: "update-downloaded",
					description: t("update.toast.description"),
					action: {
						label: t("update.toast.action"),
						onClick: () => platform.updater.installUpdate(),
					},
					duration: Number.POSITIVE_INFINITY,
				});
			} else if (status.state === "available" && status.manualDownloadUrl) {
				const url = status.manualDownloadUrl;
				toast(t("update.manualToast.title"), {
					id: "update-available",
					description: t("update.manualToast.description", {
						version: status.version,
					}),
					action: {
						label: t("update.manualToast.action"),
						onClick: () => window.open(url),
					},
					duration: Number.POSITIVE_INFINITY,
				});
			}
		});
	}, [t]);

	return null;
}
