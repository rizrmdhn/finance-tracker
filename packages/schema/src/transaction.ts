import {
	RECURRENCE_FREQUENCIES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import type { transactions } from "@finance-tracker/db";
import { z } from "zod";
import { createPaginationSchema } from "./pagination";

const SORTABLE_FIELDS = [
	"accountId",
	"amount",
	"date",
	"createdAt",
	"updatedAt",
] as const satisfies readonly (keyof typeof transactions.$inferSelect)[];

export const paginatedTransactionsSchema =
	createPaginationSchema(SORTABLE_FIELDS);

export const transactionSchema = z.object({
	amount: z
		.number({ error: "validation.amountRequired" })
		.positive({ error: "validation.amountPositive" }),
	note: z.string().optional(),
	categoryId: z.string({ error: "validation.categoryRequired" }),
	accountId: z.string({ error: "validation.accountRequired" }),
	toAccountId: z
		.string({ error: "validation.destinationAccountRequired" })
		.optional(),
	tags: z.array(z.string()).optional(),
	date: z.number({ error: "validation.dateRequired" }),
	recurrence: z
		.object({
			frequency: z.enum(RECURRENCE_FREQUENCIES, {
				error: "validation.selectFrequency",
			}),
			endDate: z.number().optional(),
		})
		.optional(),
});

export const updateTransactionSchema = transactionSchema.partial().extend({
	id: z.string(),
});

export const transactionFiltersSchema = z
	.object({
		from: z.number({ error: "validation.enterStartDate" }).optional(),
		to: z.number({ error: "validation.enterEndDate" }).optional(),
		accountId: z.string({ error: "validation.enterAccountId" }).optional(),
	})
	.optional();

export const summaryFiltersSchema = z.object({
	accountId: z.string().optional(),
	from: z.number({ error: "validation.enterStartDate" }),
	to: z.number({ error: "validation.enterEndDate" }),
	displayCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export const exportTransactionsSchema = paginatedTransactionsSchema.omit({
	page: true,
	limit: true,
});

export type PaginatedTransactionsInput = z.infer<
	typeof paginatedTransactionsSchema
>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type SummaryFilters = z.infer<typeof summaryFiltersSchema>;
export type ExportTransactionsInput = Omit<
	PaginatedTransactionsInput,
	"page" | "limit"
>;

export const infiniteTransactionsSchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(25),
	from: z.number().optional(),
	to: z.number().optional(),
	accountId: z.string().optional(),
	query: z.string().optional(),
});

export const searchTransactionsSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(20).default(8),
});

export type InfiniteTransactionsInput = z.infer<
	typeof infiniteTransactionsSchema
>;
export type SearchTransactionsInput = z.infer<typeof searchTransactionsSchema>;
