import type { PlatformType } from "@finance-tracker/sync";
import { contextBridge, ipcRenderer } from "electron";
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

		syncWithPeer: (peer: { host: string; port: number }): Promise<void> =>
			ipcRenderer.invoke("sync:sync-with-peer", peer),

		onSyncComplete: (callback: (info: { deviceId: string }) => void) => {
			ipcRenderer.on("sync:sync-complete", (_event, info) => callback(info));
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

		removeAllListeners: (channel: string) => {
			ipcRenderer.removeAllListeners(channel);
		},
	});
}

if (!("electronUpdater" in window)) {
	contextBridge.exposeInMainWorld("electronUpdater", {
		checkForUpdates: () => {
			ipcRenderer.send("check-for-updates");
		},
		onUpdateAvailable: (
			callback: (info: {
				version: string;
				releaseNotes: string | null;
			}) => void,
		) => {
			ipcRenderer.on("update-available", (_event, info) => callback(info));
		},
		onUpdateNotAvailable: (callback: () => void) => {
			ipcRenderer.on("update-not-available", () => callback());
		},
		onDownloadProgress: (
			callback: (progress: {
				percent: number;
				transferred: number;
				total: number;
			}) => void,
		) => {
			ipcRenderer.on("download-progress", (_event, progress) =>
				callback(progress),
			);
		},
		onUpdateDownloaded: (callback: () => void) => {
			ipcRenderer.on("update-downloaded", () => callback());
		},
		onUpdateError: (callback: (message: string) => void) => {
			ipcRenderer.on("update-error", (_event, message) => callback(message));
		},
		installUpdate: () => {
			ipcRenderer.send("install-update");
		},
		setAllowPrerelease: (allow: boolean): Promise<void> =>
			ipcRenderer.invoke("updater:set-prerelease", { allow }),
		removeAllListeners: (channel: string) => {
			ipcRenderer.removeAllListeners(channel);
		},
	});
}
