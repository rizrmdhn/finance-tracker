import {
	createTransaction,
	deleteTransaction,
	getTransactionSummary,
	getTransactions,
	updateTransaction,
} from "@finance-tracker/queries";
import {
	summaryFiltersSchema,
	transactionFiltersSchema,
	transactionSchema,
	updateTransactionSchema,
} from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { toTRPCError } from "../to-trpc-error";
import { procedure, router } from "../trpc";

export const transactionRouter = router({
	list: procedure
		.input(transactionFiltersSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getTransactions(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	create: procedure
		.input(transactionSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				createTransaction(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	update: procedure
		.input(updateTransactionSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				updateTransaction(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: procedure
		.input(updateTransactionSchema.pick({ id: true }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteTransaction(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	summary: procedure
		.input(summaryFiltersSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getTransactionSummary(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
