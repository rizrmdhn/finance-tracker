import {
	ConflictError,
	NotFoundError,
	RelationNotFoundError,
} from "@finance-tracker/queries";
import { TRPCError } from "@trpc/server";

export function toTRPCError(err: Error): TRPCError {
	if (err instanceof NotFoundError)
		return new TRPCError({ code: "NOT_FOUND", message: err.message });
	if (err instanceof ConflictError)
		return new TRPCError({ code: "CONFLICT", message: err.message });
	if (err instanceof RelationNotFoundError)
		return new TRPCError({ code: "NOT_FOUND", message: err.message });
	return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
}
