import { SYNC_ERROR_TOAST_DURATION, syncErrorKey } from "@finance-tracker/sync";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { globalErrorToast } from "@/lib/toast";
import { platform } from "@/platform";

/** App-wide sync events: refresh all data after any sync, report failed incoming syncs. */
export function SyncListener() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!platform.sync.isSupported) return;

		platform.sync.onSyncComplete(() => {
			void queryClient.invalidateQueries();
		});

		platform.sync.onSyncError(({ code }) => {
			globalErrorToast(
				t(syncErrorKey(code)),
				t("sync.toast.syncFailed"),
				SYNC_ERROR_TOAST_DURATION,
			);
		});

		return () => {
			platform.sync.removeAllListeners("sync:sync-complete");
			platform.sync.removeAllListeners("sync:sync-error");
		};
	}, [queryClient, t]);

	return null;
}
