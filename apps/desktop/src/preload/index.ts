import { contextBridge } from "electron";
import { exposeElectronTRPC } from "electron-trpc/main";

contextBridge.exposeInMainWorld("electronTRPC", exposeElectronTRPC());
