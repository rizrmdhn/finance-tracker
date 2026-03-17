import type { AppRouter } from "@finance-tracker/api";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCProxyClient } from "@trpc/client";
import { ipcLink } from "electron-trpc/renderer";
import { globalErrorToast } from "./toast";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			globalErrorToast(error.message || "An unexpected error occurred");
		},
	}),
});

export const trpc = createTRPCProxyClient<AppRouter>({
	links: [ipcLink()],
});
