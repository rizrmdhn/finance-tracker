import { budgets } from "../schema";
import type { AnyDatabase } from "../types";

// March 1, 2026 00:00:00 UTC (seconds)
const MAR_01 = 1772323200;

export async function seedDefaultBudgets(db: AnyDatabase) {
	return await db
		.insert(budgets)
		.values([
			{
				id: "seed_bud_food",
				categoryId: "seed_exp_food",
				amount: 1000000,
				period: "monthly",
				startDate: MAR_01,
			},
			{
				id: "seed_bud_transport",
				categoryId: "seed_exp_transport",
				amount: 300000,
				period: "monthly",
				startDate: MAR_01,
			},
			{
				id: "seed_bud_shopping",
				categoryId: "seed_exp_shopping",
				amount: 500000,
				period: "monthly",
				startDate: MAR_01,
			},
			{
				id: "seed_bud_bills",
				categoryId: "seed_exp_bills",
				amount: 400000,
				period: "monthly",
				startDate: MAR_01,
			},
			{
				id: "seed_bud_entertainment",
				categoryId: "seed_exp_entertainment",
				amount: 200000,
				period: "monthly",
				startDate: MAR_01,
			},
		])
		.onConflictDoNothing()
		.returning();
}
