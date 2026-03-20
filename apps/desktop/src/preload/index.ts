import { contextBridge, ipcRenderer } from "electron";
import { exposeElectronTRPC } from "trpc-electron/main";

contextBridge.exposeInMainWorld("electronTRPC", exposeElectronTRPC());

contextBridge.exposeInMainWorld("updater", {
	onUpdateAvailable: (callback: () => void) =>
		ipcRenderer.on("update-available", callback),
	onUpdateDownloaded: (callback: () => void) =>
		ipcRenderer.on("update-downloaded", callback),
	installUpdate: () => ipcRenderer.send("install-update"),
});
