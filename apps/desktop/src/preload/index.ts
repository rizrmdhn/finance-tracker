import type {
	PlatformType,
	SyncErrorCode,
	SyncResult,
} from "@finance-tracker/sync";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import { exposeElectronTRPC } from "trpc-electron/main";

exposeElectronTRPC();

if (!("electronApp" in window)) {
	contextBridge.exposeInMainWorld("electronApp", {
		getVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),
	});
}

// Guard against double-registration during HMR
if (!("electronDataManager" in window)) {
	contextBridge.exposeInMainWorld("electronDataManager", {
		backup: (): Promise<{
			success: boolean;
			cancelled?: boolean;
			error?: string;
		}> => ipcRenderer.invoke("backup-database"),
		restore: (): Promise<{
			success: boolean;
			cancelled?: boolean;
			error?: string;
		}> => ipcRenderer.invoke("restore-database"),
		wipe: (): Promise<{ success: boolean; error?: string }> =>
			ipcRenderer.invoke("wipe-database"),
		exportFile: (payload: {
			content: string;
			format: "csv" | "json";
			defaultName: string;
		}): Promise<{ success: boolean; cancelled?: boolean; error?: string }> =>
			ipcRenderer.invoke("export-file", payload),
		importFile: (): Promise<{
			success: boolean;
			cancelled?: boolean;
			content?: string;
			filename?: string;
			error?: string;
		}> => ipcRenderer.invoke("import-file"),
	});
}

if (!("electronSync" in window)) {
	contextBridge.exposeInMainWorld("electronSync", {
		getDeviceInfo: (): Promise<{
			deviceId: string;
			deviceName: string;
			platform: PlatformType;
		}> => ipcRenderer.invoke("sync:get-device-info"),

		startDiscovery: (): Promise<void> =>
			ipcRenderer.invoke("sync:start-discovery"),

		stopDiscovery: (): Promise<void> =>
			ipcRenderer.invoke("sync:stop-discovery"),

		initiatePair: (peer: { host: string; port: number }): Promise<void> =>
			ipcRenderer.invoke("sync:initiate-pair", peer),

		confirmPair: (deviceId: string): Promise<void> =>
			ipcRenderer.invoke("sync:confirm-pair", { deviceId }),

		rejectPair: (deviceId: string, reason?: string): Promise<void> =>
			ipcRenderer.invoke("sync:reject-pair", { deviceId, reason }),

		/** `deviceId`: the trusted peer we expect at this address, when known. */
		syncWithPeer: (peer: {
			host: string;
			port: number;
			deviceId?: string;
		}): Promise<
			({ ok: true } & SyncResult) | { ok: false; code: SyncErrorCode }
		> => ipcRenderer.invoke("sync:sync-with-peer", peer),

		/** Fired after every successful sync, incoming or outgoing. */
		onSyncComplete: (callback: (info: { deviceId: string }) => void) => {
			ipcRenderer.on("sync:sync-complete", (_event, info) => callback(info));
		},

		/** Fired when a sync started by another device fails. */
		onSyncError: (
			callback: (info: { deviceId?: string; code: SyncErrorCode }) => void,
		) => {
			ipcRenderer.on("sync:sync-error", (_event, info) => callback(info));
		},

		onPeerDiscovered: (
			callback: (peer: {
				deviceId: string;
				deviceName: string;
				platform: PlatformType;
				host: string;
				port: number;
			}) => void,
		) => {
			ipcRenderer.on("sync:peer-discovered", (_event, peer) => callback(peer));
		},

		onPeerLost: (callback: (info: { deviceId: string }) => void) => {
			ipcRenderer.on("sync:peer-lost", (_event, info) => callback(info));
		},

		onPairRequestReceived: (
			callback: (info: {
				deviceId: string;
				deviceName: string;
				platform: PlatformType;
				sasCode: string;
			}) => void,
		) => {
			ipcRenderer.on("sync:pair-request-received", (_event, info) =>
				callback(info),
			);
		},

		onPairChallenge: (
			callback: (info: {
				deviceId: string;
				deviceName: string;
				sasCode: string;
			}) => void,
		) => {
			ipcRenderer.on("sync:pair-challenge", (_event, info) => callback(info));
		},

		onPairConfirmed: (
			callback: (info: {
				deviceId: string;
				deviceName: string;
				platform: PlatformType;
			}) => void,
		) => {
			ipcRenderer.on("sync:pair-confirmed", (_event, info) => callback(info));
		},

		onPairRejected: (
			callback: (info: { deviceId: string; reason?: string }) => void,
		) => {
			ipcRenderer.on("sync:pair-rejected", (_event, info) => callback(info));
		},

		/** The pairing connection failed or closed before the pairing completed. */
		onPairFailed: (callback: (info: { deviceId?: string }) => void) => {
			ipcRenderer.on("sync:pair-failed", (_event, info) => callback(info));
		},

		removeAllListeners: (channel: string) => {
			ipcRenderer.removeAllListeners(channel);
		},
	});
}

if (!("electronUpdater" in window)) {
	contextBridge.exposeInMainWorld("electronUpdater", {
		checkForUpdates: () => {
			ipcRenderer.send("updater:check");
		},
		getStatus: () => ipcRenderer.invoke("updater:get-status"),
		// Returns its own unsubscribe so one component's cleanup can't drop
		// another component's listener on the same channel.
		onStatus: (callback: (status: unknown) => void) => {
			const listener = (_event: IpcRendererEvent, status: unknown) =>
				callback(status);
			ipcRenderer.on("updater:status", listener);
			return () => {
				ipcRenderer.removeListener("updater:status", listener);
			};
		},
		installUpdate: () => {
			ipcRenderer.send("updater:install");
		},
		setAllowPrerelease: (allow: boolean): Promise<void> =>
			ipcRenderer.invoke("updater:set-prerelease", { allow }),
	});
}
