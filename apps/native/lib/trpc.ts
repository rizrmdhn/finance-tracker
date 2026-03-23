import type { AppRouter } from "@finance-tracker/api";
import { appRouter, createTRPCContext } from "@finance-tracker/api";
import type { AnyDatabase } from "@finance-tracker/db";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import { createTRPCClient, loggerLink, TRPCClientError } from "@trpc/client";
import { callTRPCProcedure, getTRPCErrorFromUnknown } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { db } from "./db";

function localLink(): TRPCLink<AppRouter> {
	return () =>
		({ op }) =>
			observable((observer) => {
				createTRPCContext({ db: db as unknown as AnyDatabase })
					.then((ctx) =>
						callTRPCProcedure({
							router: appRouter,
							path: op.path,
							getRawInput: async () => op.input,
							ctx,
							type: op.type,
							signal: op.signal ?? undefined,
							batchIndex: 0,
						}),
					)
					.then((data) => {
						observer.next({ result: { type: "data", data } });
						observer.complete();
					})
					.catch((cause) => {
						observer.error(
							cause instanceof TRPCClientError
								? cause
								: new TRPCClientError(
										(cause as Error)?.message ?? "Unknown error",
										{ cause: getTRPCErrorFromUnknown(cause) },
									),
						);
					});

				return () => {};
			});
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			console.error("[trpc]", error.message || "An unexpected error occurred");
		},
	}),
});

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		loggerLink({
			enabled: (op) =>
				__DEV__ || (op.direction === "down" && op.result instanceof Error),
		}),
		localLink(),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
