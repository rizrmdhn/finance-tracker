import { contextBridge, ipcRenderer } from "electron";
import { exposeElectronTRPC } from "trpc-electron/main";

contextBridge.exposeInMainWorld("electronTRPC", exposeElectronTRPC());

contextBridge.exposeInMainWorld("updater", {
	checkForUpdates: () => ipcRenderer.send("check-for-updates"),
	onUpdateAvailable: (
		callback: (info: { version: string; releaseNotes: string | null }) => void,
	) => ipcRenderer.on("update-available", (_event, info) => callback(info)),
	onUpdateNotAvailable: (callback: () => void) =>
		ipcRenderer.on("update-not-available", () => callback()),
	onDownloadProgress: (
		callback: (progress: {
			percent: number;
			transferred: number;
			total: number;
		}) => void,
	) =>
		ipcRenderer.on("download-progress", (_event, progress) =>
			callback(progress),
		),
	onUpdateDownloaded: (callback: () => void) =>
		ipcRenderer.on("update-downloaded", () => callback()),
	installUpdate: () => ipcRenderer.send("install-update"),
	removeAllListeners: (channel: string) =>
		ipcRenderer.removeAllListeners(channel),
});
