import type { AppRouter } from "@finance-tracker/api";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";
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
					import.meta.env.DEV ||
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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/trpc";

export const { queryClient, trpcClient, trpc } = createTrpcClient(
	httpBatchLink({
		url: API_URL,
		transformer: SuperJSON,
	}),
);
