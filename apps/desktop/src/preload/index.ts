import { contextBridge } from "electron";
import { exposeElectronTRPC } from "trpc-electron/main";

contextBridge.exposeInMainWorld("electronTRPC", exposeElectronTRPC());
