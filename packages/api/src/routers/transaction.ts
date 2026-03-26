import {
	computeNextRunAt,
	createRecurrence,
	createTransaction,
	deleteTransaction,
	getAllFilteredTransactions,
	getInfiniteTransactions,
	getOffsetPaginatedTransactions,
	getRecurrenceByTemplateId,
	getTransactionSummary,
	getTransactions,
	updateTransaction,
} from "@finance-tracker/queries";
import {
	exportTransactionsSchema,
	infiniteTransactionsSchema,
	paginatedTransactionsSchema,
	summaryFiltersSchema,
	transactionFiltersSchema,
	transactionSchema,
	updateTransactionSchema,
} from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
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

	paginated: publicProcedure
		.input(paginatedTransactionsSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getOffsetPaginatedTransactions(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	infiniteList: publicProcedure
		.input(infiniteTransactionsSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getInfiniteTransactions(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	create: publicProcedure
		.input(transactionSchema)
		.mutation(async ({ ctx, input }) => {
			const { recurrence: recurrenceInput, ...txInput } = input;

			const [data, err] = await tryCatchAsync(() =>
				createTransaction(ctx.db, txInput),
			);
			if (err) throw toTRPCError(err);

			if (recurrenceInput && data) {
				const nextRunAt = computeNextRunAt(
					recurrenceInput.frequency,
					data.date,
				);
				const [, recErr] = await tryCatchAsync(() =>
					createRecurrence(ctx.db, {
						templateTransactionId: data.id,
						frequency: recurrenceInput.frequency,
						nextRunAt,
						endDate: recurrenceInput.endDate,
					}),
				);
				if (recErr) throw toTRPCError(recErr);
			}

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
			// Block deletion if a recurrence rule references this transaction
			const [existingRule, ruleErr] = await tryCatchAsync(() =>
				getRecurrenceByTemplateId(ctx.db, input.id),
			);
			if (ruleErr) throw toTRPCError(ruleErr);
			if (existingRule) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"This transaction has a recurring rule attached. Delete the recurring rule first.",
				});
			}

			const [data, err] = await tryCatchAsync(() =>
				deleteTransaction(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	exportData: publicProcedure
		.input(exportTransactionsSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getAllFilteredTransactions(ctx.db, input),
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
