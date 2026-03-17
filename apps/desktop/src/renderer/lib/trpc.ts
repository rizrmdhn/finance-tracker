import type { AppRouter } from "@finance/api";
import { createTRPCProxyClient } from "@trpc/client";
import { ipcLink } from "electron-trpc/renderer";

export const trpc = createTRPCProxyClient<AppRouter>({
	links: [ipcLink()],
});
