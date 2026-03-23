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
		backup: (): Promise<{ success: boolean; cancelled?: boolean; error?: string }> =>
			ipcRenderer.invoke("backup-database"),
		restore: (): Promise<{ success: boolean; cancelled?: boolean; error?: string }> =>
			ipcRenderer.invoke("restore-database"),
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

if (!("electronUpdater" in window)) {
	contextBridge.exposeInMainWorld("electronUpdater", {
		checkForUpdates: () => {
			ipcRenderer.send("check-for-updates");
		},
		onUpdateAvailable: (
			callback: (info: { version: string; releaseNotes: string | null }) => void,
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
			ipcRenderer.on("download-progress", (_event, progress) => callback(progress));
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
		removeAllListeners: (channel: string) => {
			ipcRenderer.removeAllListeners(channel);
		},
	});
}
