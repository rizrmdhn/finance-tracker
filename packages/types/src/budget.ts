import type { budgets } from "@finance-tracker/db";
import type { Category } from "./category";

export type Budget = typeof budgets.$inferSelect;
export type BudgetWithSpent = Budget & {
	category: Category;
	spent: number;
	remaining: number;
	isOverBudget: boolean;
};
