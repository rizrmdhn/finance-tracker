import { z } from "zod";

export const budgetSchema = z.object({
	categoryId: z.string().min(1),
	amount: z.number().positive(),
	period: z.enum(["monthly", "weekly"]),
	startDate: z.number(), // Unix timestamp
});

export const budgetUpdateSchema = budgetSchema
	.partial()
	.extend({ id: z.string() });

export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
