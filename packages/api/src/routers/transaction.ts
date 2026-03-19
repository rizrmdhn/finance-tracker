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
import { createTRPCRouter, publicProcedure } from "..";
import { toTRPCError } from "../utils/to-trpc-error";

export const transactionRouter = createTRPCRouter({
	list: publicProcedure
		.input(transactionFiltersSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getTransactions(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	create: publicProcedure
		.input(transactionSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				createTransaction(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	update: publicProcedure
		.input(updateTransactionSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				updateTransaction(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: publicProcedure
		.input(updateTransactionSchema.pick({ id: true }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteTransaction(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	summary: publicProcedure
		.input(summaryFiltersSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getTransactionSummary(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
