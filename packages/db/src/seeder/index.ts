import type { AnyDatabase } from "../types";
import { seedDefaultAccounts } from "./accounts";
import { seedDefaultAppSettings } from "./app-settings";
import { seedDefaultBudgets } from "./budgets";
import { seedDefaultCategories } from "./categories";
import { seedDefaultRecurrences } from "./recurrences";
import { seedDefaultTransactions } from "./transactions";

export * from "./accounts";
export * from "./app-settings";
export * from "./budgets";
export * from "./categories";
export * from "./recurrences";
export * from "./transactions";

export async function seedDatabase(db: AnyDatabase) {
	const isDev = process.env.NODE_ENV !== "production";

	// Always seed app settings — required for the app to function in all environments
	const appSettings = await seedDefaultAppSettings(db);

	if (!isDev) {
		return {
			appSettings,
			categories: [],
			accounts: [],
			budgets: [],
			transactions: [],
			recurrences: [],
		};
	}

	// Seed categories and accounts in parallel (no dependencies between them)
	const [categories, accounts] = await Promise.all([
		seedDefaultCategories(db),
		seedDefaultAccounts(db),
	]);

	// Transactions and budgets both depend on categories (+ accounts for transactions) — run in parallel
	const [transactions, budgets] = await Promise.all([
		seedDefaultTransactions(db),
		seedDefaultBudgets(db),
	]);

	// Recurrences depend on transactions (FK: templateTransactionId)
	const recurrences = await seedDefaultRecurrences(db);

	return {
		appSettings,
		categories,
		accounts,
		budgets,
		transactions,
		recurrences,
	};
}
