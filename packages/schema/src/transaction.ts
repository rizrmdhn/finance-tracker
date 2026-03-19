import { z } from "zod";

export const transactionSchema = z.object({
	amount: z.number().positive(),
	note: z.string().optional(),
	categoryId: z.string().optional(),
	tags: z.array(z.string()).optional(),
	date: z.number(),
});

export const updateTransactionSchema = transactionSchema.partial().extend({
	id: z.string(),
});

export const transactionFiltersSchema = z
	.object({
		from: z.number().optional(),
		to: z.number().optional(),
	})
	.optional();

export const summaryFiltersSchema = z.object({
	from: z.number(),
	to: z.number(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type SummaryFilters = z.infer<typeof summaryFiltersSchema>;
