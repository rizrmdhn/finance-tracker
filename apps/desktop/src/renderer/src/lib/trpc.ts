import type { AppRouter } from "@finance-tracker/api";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";
import { ipcLink } from "trpc-electron/renderer";
import { globalErrorToast } from "./toast";

function createTrpcClient(transportLink: TRPCLink<AppRouter>) {
	const queryClient = new QueryClient({
		queryCache: new QueryCache({
			onError: (error) => {
				globalErrorToast(error.message || "An unexpected error occurred");
			},
		}),
	});

	const trpcClient = createTRPCClient<AppRouter>({
		links: [
			loggerLink({
				enabled: (op) =>
					process.env.NODE_ENV === "development" ||
					(op.direction === "down" && op.result instanceof Error),
			}),
			transportLink,
		],
	});

	const trpc = createTRPCOptionsProxy<AppRouter>({
		client: trpcClient,
		queryClient,
	});

	return { queryClient, trpcClient, trpc };
}

export const { queryClient, trpcClient, trpc } = createTrpcClient(
	ipcLink({ transformer: SuperJSON }),
);
