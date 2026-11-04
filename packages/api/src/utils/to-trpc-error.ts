import {
	AccountAlreadyLinkedError,
	AccountIsContributionSourceError,
	AllocationLimitExceededError,
	ConflictError,
	GoalNotActiveError,
	InsufficientFreeBalanceError,
	LinkedAccountContributionError,
	NotFoundError,
	RelationNotFoundError,
	WithdrawalExceedsAllocationError,
} from "@finance-tracker/queries";
import { TRPCError } from "@trpc/server";

export function toTRPCError(err: Error): TRPCError {
	if (err instanceof NotFoundError)
		return new TRPCError({ code: "NOT_FOUND", message: err.message });
	if (err instanceof ConflictError)
		return new TRPCError({ code: "CONFLICT", message: err.message });
	if (err instanceof RelationNotFoundError)
		return new TRPCError({ code: "NOT_FOUND", message: err.message });
	// `cause` lets the errorFormatter expose the goal rule's code
	if (err instanceof GoalNotActiveError)
		return new TRPCError({
			code: "PRECONDITION_FAILED",
			message: err.message,
			cause: err,
		});
	if (
		err instanceof AccountAlreadyLinkedError ||
		err instanceof AccountIsContributionSourceError
	)
		return new TRPCError({
			code: "CONFLICT",
			message: err.message,
			cause: err,
		});
	if (
		err instanceof LinkedAccountContributionError ||
		err instanceof InsufficientFreeBalanceError ||
		err instanceof WithdrawalExceedsAllocationError ||
		err instanceof AllocationLimitExceededError
	)
		return new TRPCError({
			code: "BAD_REQUEST",
			message: err.message,
			cause: err,
		});
	return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
}
