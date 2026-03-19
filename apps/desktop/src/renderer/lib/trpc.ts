import type { AppRouter } from "@finance-tracker/api";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";
import { globalErrorToast } from "./toast";
import { ipcLink, type DataTransformer } from "./ipc-link";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			globalErrorToast(error.message || "An unexpected error occurred");
		},
	}),
});

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		loggerLink({
			enabled: (op) =>
				process.env.NODE_ENV === "development" ||
				(op.direction === "down" && op.result instanceof Error),
		}),
		ipcLink({ transformer: SuperJSON as DataTransformer }),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
