import type { AnyDatabase } from "../types";
import { transactions } from "../schema";

// Unix timestamps (seconds) for March 2026
const MAR_01 = 1772323200;
const MAR_05 = 1772668800;
const MAR_10 = 1773100800;
const MAR_12 = 1773273600;
const MAR_15 = 1773532800;
const MAR_18 = 1773792000;
const MAR_20 = 1773964800;

export async function seedDefaultTransactions(db: AnyDatabase) {
	return await db
		.insert(transactions)
		.values([
			// ── Income ──────────────────────────────────────────────────────────
			{
				id:         "seed_tx_salary",
				amount:     5000000,
				note:       "Monthly salary",
				categoryId: "seed_income_salary",
				accountId:  "seed_acc_bank",
				date:       MAR_01,
			},
			{
				id:         "seed_tx_freelance",
				amount:     1500000,
				note:       "Website project",
				categoryId: "seed_income_freelance",
				accountId:  "seed_acc_bank",
				date:       MAR_10,
			},
			// ── Expense ─────────────────────────────────────────────────────────
			{
				id:         "seed_tx_food_1",
				amount:     45000,
				note:       "Lunch",
				categoryId: "seed_exp_food",
				accountId:  "seed_acc_cash",
				date:       MAR_05,
			},
			{
				id:         "seed_tx_food_2",
				amount:     120000,
				note:       "Dinner with family",
				categoryId: "seed_exp_food",
				accountId:  "seed_acc_ewallet",
				date:       MAR_12,
			},
			{
				id:         "seed_tx_transport",
				amount:     35000,
				note:       "Grab",
				categoryId: "seed_exp_transport",
				accountId:  "seed_acc_ewallet",
				date:       MAR_12,
			},
			{
				id:         "seed_tx_bills",
				amount:     350000,
				note:       "Electricity & water",
				categoryId: "seed_exp_bills",
				accountId:  "seed_acc_bank",
				date:       MAR_15,
			},
			{
				id:         "seed_tx_shopping",
				amount:     250000,
				note:       "Groceries",
				categoryId: "seed_exp_shopping",
				accountId:  "seed_acc_ewallet",
				date:       MAR_18,
			},
			// ── Transfer ────────────────────────────────────────────────────────
			{
				id:          "seed_tx_transfer",
				amount:      500000,
				note:        "Top up e-wallet",
				categoryId:  "seed_transfer",
				accountId:   "seed_acc_bank",
				toAccountId: "seed_acc_ewallet",
				date:        MAR_20,
			},
			// ── Recurring template (monthly salary) ─────────────────────────────
			{
				id:         "seed_tx_recur_salary",
				amount:     5000000,
				note:       "Monthly salary (recurring)",
				categoryId: "seed_income_salary",
				accountId:  "seed_acc_bank",
				date:       MAR_01,
			},
		])
		.onConflictDoNothing()
		.returning();
}
