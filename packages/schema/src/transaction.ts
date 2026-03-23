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
	amount: z.number().positive(),
	note: z.string().optional(),
	categoryId: z.string(),
	accountId: z.string(),
	toAccountId: z.string().optional(),
	tags: z.array(z.string()).optional(),
	date: z.number(),
	recurrence: z
		.object({
			frequency: z.enum(RECURRENCE_FREQUENCIES),
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
