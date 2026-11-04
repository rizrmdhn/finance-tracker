import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import {
	SYNC_ERROR_TOAST_DURATION,
	SyncError,
	type SyncErrorCode,
	syncErrorKey,
} from "@finance-tracker/sync";
import { useEffect } from "react";
import { AppState } from "react-native";
import { getDeviceIdentity } from "@/lib/device-identity";
import i18n from "@/lib/i18n";
import { syncWithPeer } from "@/lib/sync-client";
import { withSyncLock } from "@/lib/sync-runner";
import { globalErrorToast } from "@/lib/toast";
import { queryClient, trpc, trpcClient } from "@/lib/trpc";

const CHANGE_DEBOUNCE_MS = 5000;
/** Expected whenever the peer is not on the same network. */
const QUIET_ERRORS = new Set<SyncErrorCode>(["timeout", "connection-closed"]);
/** Routers whose mutations don't change data worth pushing right away. */
const IGNORED_ROUTERS = new Set(["peer", "appSetting"]);

/** Peers whose failure was already shown this app session. */
const warnedPeers = new Set<string>();
let running = false;
let rerun = false;

async function syncAllPeers() {
	const setting = await trpcClient.appSetting.get.query({ key: "auto_sync" });
	if ((setting?.value ?? APP_SETTINGS_DEFAULTS.auto_sync) !== "true") return;

	const { deviceId } = await getDeviceIdentity();
	const peers = await trpcClient.peer.list.query();
	let synced = false;
	let received = 0;

	for (const peer of peers) {
		const host = peer.syncPeer?.lastKnownHost;
		if (!host) continue;
		try {
			const result = await withSyncLock(() =>
				syncWithPeer({ host, deviceId, expectedPeerDeviceId: peer.deviceId }),
			);
			synced = true;
			received += result.received;
			warnedPeers.delete(peer.deviceId);
		} catch (err) {
			const code = err instanceof SyncError ? err.code : "internal";
			if (QUIET_ERRORS.has(code) || warnedPeers.has(peer.deviceId)) continue;
			warnedPeers.add(peer.deviceId);
			console.error("[auto-sync] sync failed:", peer.deviceId, code, err);
			globalErrorToast(
				i18n.t(syncErrorKey(code)),
				i18n.t("sync.toast.autoSyncFailed", { name: peer.deviceName }),
				SYNC_ERROR_TOAST_DURATION,
			);
		}
	}

	if (received > 0) await queryClient.invalidateQueries();
	else if (synced) {
		await queryClient.invalidateQueries(trpc.peer.list.queryOptions());
	}
}

/** Single-flight: a request during a run schedules exactly one more run. */
function requestAutoSync() {
	if (running) {
		rerun = true;
		return;
	}
	running = true;
	void (async () => {
		do {
			rerun = false;
			try {
				await syncAllPeers();
			} catch (err) {
				console.error("[auto-sync]", err);
			}
		} while (rerun);
		running = false;
	})();
}

/**
 * Syncs with every trusted peer that has a known host on mount, when the app
 * returns to the foreground, and shortly after local changes. Mount once.
 */
export function useAutoSync() {
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const flush = () => {
			if (timer === undefined) return;
			clearTimeout(timer);
			timer = undefined;
			requestAutoSync();
		};

		const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
			if (event.type !== "updated" || event.action.type !== "success") return;
			// tRPC mutation keys look like [["router", "procedure"]]
			const path = event.mutation.options.mutationKey?.[0];
			const router = Array.isArray(path) ? path[0] : undefined;
			if (typeof router !== "string" || IGNORED_ROUTERS.has(router)) return;
			clearTimeout(timer);
			timer = setTimeout(flush, CHANGE_DEBOUNCE_MS);
		});

		const appState = AppState.addEventListener("change", (state) => {
			if (state === "active") requestAutoSync();
			// Timers may not fire in the background, so push pending changes now
			else if (state === "background") flush();
		});

		requestAutoSync();

		return () => {
			clearTimeout(timer);
			unsubscribe();
			appState.remove();
		};
	}, []);
}
