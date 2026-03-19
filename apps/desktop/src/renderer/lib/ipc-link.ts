import type { Operation, TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import type { AnyTRPCRouter, inferRouterError } from "@trpc/server";
import type { Observer } from "@trpc/server/observable";
import { observable } from "@trpc/server/observable";
import type {
	TRPCResponse,
	TRPCResponseMessage,
	TRPCResultMessage,
} from "@trpc/server/rpc";

interface ElectronTRPCGlobal {
	sendMessage: (
		args:
			| { method: "request"; operation: Operation }
			| { method: "subscription.stop"; id: string | number },
	) => void;
	onMessage: (callback: (response: TRPCResponseMessage) => void) => void;
}

export interface DataTransformer {
	serialize: (data: unknown) => unknown;
	deserialize: (data: unknown) => unknown;
}

const identityTransformer: DataTransformer = {
	serialize: (x) => x,
	deserialize: (x) => x,
};

export interface IPCLinkOptions {
	transformer?: DataTransformer;
}

// ——— internal ————————————————————————————————————————————

function getElectronTRPC(): ElectronTRPCGlobal {
	const electronTRPC = (globalThis as Record<string, unknown>).electronTRPC as
		| ElectronTRPCGlobal
		| undefined;

	if (!electronTRPC) {
		throw new Error(
			"Could not find `electronTRPC` global. Check that `exposeElectronTRPC` has been called in your preload file.",
		);
	}

	return electronTRPC;
}

type IPCCallbacks<TRouter extends AnyTRPCRouter> = Observer<
	TRPCResponseMessage<unknown, inferRouterError<TRouter>>,
	TRPCClientError<TRouter>
>;

class IPCClient {
	#pending = new Map<
		string | number,
		{ type: string; callbacks: IPCCallbacks<AnyTRPCRouter>; op: Operation }
	>();
	#electronTRPC = getElectronTRPC();

	constructor() {
		this.#electronTRPC.onMessage((response) => {
			this.#handleResponse(response);
		});
	}

	#handleResponse(response: TRPCResponseMessage) {
		// biome-ignore lint/style/noNonNullAssertion: We check for the presence of the request below, so we know it's not null
		const request = response.id !== null && this.#pending.get(response.id!);
		if (!request) return;

		request.callbacks.next(response);

		if ("result" in response && response.result.type === "stopped") {
			request.callbacks.complete();
		}
	}

	request(op: Operation, callbacks: IPCCallbacks<AnyTRPCRouter>) {
		const { type, id } = op;

		this.#pending.set(id, { type, callbacks, op });
		this.#electronTRPC.sendMessage({ method: "request", operation: op });

		return () => {
			const cb = this.#pending.get(id)?.callbacks;
			this.#pending.delete(id);
			cb?.complete();

			if (type === "subscription") {
				this.#electronTRPC.sendMessage({ method: "subscription.stop", id });
			}
		};
	}
}

function transformResult<TRouter extends AnyTRPCRouter, TOutput>(
	response:
		| TRPCResponseMessage<TOutput, inferRouterError<TRouter>>
		| TRPCResponse<TOutput, inferRouterError<TRouter>>,
	transformer: DataTransformer,
) {
	if ("error" in response) {
		const error = transformer.deserialize(
			response.error,
		) as inferRouterError<TRouter>;
		return { ok: false, error: { ...response, error } } as const;
	}

	const result = {
		...response.result,
		...((!response.result.type || response.result.type === "data") && {
			type: "data",
			data: transformer.deserialize(response.result.data) as TOutput,
		}),
	} as TRPCResultMessage<TOutput>["result"];

	return { ok: true, result } as const;
}

// ——— public ——————————————————————————————————————————————

export function ipcLink<TRouter extends AnyTRPCRouter>(
	opts?: IPCLinkOptions,
): TRPCLink<TRouter> {
	return () => {
		const client = new IPCClient();
		const transformer = opts?.transformer ?? identityTransformer;

		return ({ op }) => {
			return observable((observer) => {
				op.input = transformer.serialize(op.input);

				let isDone = false;

				const unsubscribe = client.request(op, {
					error(err) {
						isDone = true;
						observer.error(err as TRPCClientError<TRouter>);
						unsubscribe();
					},
					complete() {
						if (!isDone) {
							isDone = true;
							observer.error(
								TRPCClientError.from(new Error("Operation ended prematurely")),
							);
						} else {
							observer.complete();
						}
					},
					next(response) {
						const transformed = transformResult<TRouter, unknown>(
							response,
							transformer,
						);

						if (!transformed.ok) {
							observer.error(TRPCClientError.from(transformed.error));
							return;
						}

						observer.next({ result: transformed.result });

						if (op.type !== "subscription") {
							isDone = true;
							unsubscribe();
							observer.complete();
						}
					},
				});

				return () => {
					isDone = true;
					unsubscribe();
				};
			});
		};
	};
}
