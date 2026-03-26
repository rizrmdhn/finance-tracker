import { RECURRENCE_FREQUENCIES } from "@finance-tracker/constants";
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
		.number({ error: "Amount is required" })
		.positive({ error: "Amount must be greater than 0" }),
	note: z.string().optional(),
	categoryId: z.string({ error: "Category is required" }),
	accountId: z.string({ error: "Account is required" }),
	toAccountId: z.string({ error: "Destination account is required" }).optional(),
	tags: z.array(z.string()).optional(),
	date: z.number({ error: "Date is required" }),
	recurrence: z
		.object({
			frequency: z.enum(RECURRENCE_FREQUENCIES, {
				error: "Please select a frequency",
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
		from: z.number({ error: "Please provide a valid start date" }).optional(),
		to: z.number({ error: "Please provide a valid end date" }).optional(),
		accountId: z
			.string({ error: "Please provide a valid account ID" })
			.optional(),
	})
	.optional();

export const summaryFiltersSchema = z.object({
	accountId: z.string().optional(),
	from: z.number({ error: "Please provide a valid start date" }),
	to: z.number({ error: "Please provide a valid end date" }),
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
});

export const searchTransactionsSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(20).default(8),
});

export type InfiniteTransactionsInput = z.infer<
	typeof infiniteTransactionsSchema
>;
export type SearchTransactionsInput = z.infer<typeof searchTransactionsSchema>;
