import { type AnyDatabase, budgets } from "@finance-tracker/db";
import type { BudgetInput, BudgetUpdateInput } from "@finance-tracker/schema";
import type { BudgetWithSpent } from "@finance-tracker/types";
import { eq } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function getBudgets(db: AnyDatabase) {
	return await db.query.budgets.findMany({ with: { category: true } });
}

export async function getBudgetById(db: AnyDatabase, id: string) {
	const budget = await db.query.budgets.findFirst({
		where: (budgets, { eq }) => eq(budgets.id, id),
	});
	return budget;
}

export async function createBudget(db: AnyDatabase, input: BudgetInput) {
	const [result] = await db.insert(budgets).values(input).returning();

	if (!result) throw new Error("Failed to create budget");

	return result;
}

export async function updateBudget(db: AnyDatabase, input: BudgetUpdateInput) {
	const budget = await getBudgetById(db, input.id);

	if (!budget) throw new NotFoundError("Budget", input.id);

	const { id, ...data } = input;

	const [result] = await db
		.update(budgets)
		.set(data)
		.where(eq(budgets.id, id))
		.returning();

	if (!result) throw new Error("Failed to update budget");

	return result;
}

export async function deleteBudget(db: AnyDatabase, id: string) {
	const budget = await getBudgetById(db, id);

	if (!budget) throw new NotFoundError("Budget", id);

	const [result] = await db
		.delete(budgets)
		.where(eq(budgets.id, id))
		.returning();

	if (!result) throw new Error("Failed to delete budget");

	return result;
}

export async function getBudgetsWithSpent(
	db: AnyDatabase,
	filter: { from: number; to: number },
): Promise<BudgetWithSpent[]> {
	const allBudgets = await db.query.budgets.findMany({
		with: { category: true },
	});

	const periodTransactions = await db.query.transactions.findMany({
		with: { category: true },
		where: (t, { and, between, isNull }) =>
			and(between(t.date, filter.from, filter.to), isNull(t.deletedAt)),
	});

	// Only expense-type transactions count toward a budget
	const spentMap = new Map<string, number>();
	for (const tx of periodTransactions) {
		if (tx.category?.type === "expense") {
			spentMap.set(
				tx.categoryId,
				(spentMap.get(tx.categoryId) ?? 0) + tx.amount,
			);
		}
	}

	return allBudgets.map((budget) => {
		const spent = spentMap.get(budget.categoryId) ?? 0;
		const remaining = budget.amount - spent;
		return {
			...budget,
			spent,
			remaining,
			isOverBudget: spent > budget.amount,
		};
	});
}
