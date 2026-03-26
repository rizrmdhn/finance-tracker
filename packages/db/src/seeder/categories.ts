import { categories } from "../schema";
import type { AnyDatabase } from "../types";

export async function seedDefaultCategories(db: AnyDatabase) {
	return await db
		.insert(categories)
		.values([
			// ── Income ──────────────────────────────────────────────────────────
			{
				id: "seed_income_salary",
				name: "Salary",
				icon: "Briefcase",
				color: "#22c55e",
				type: "income",
			},
			{
				id: "seed_income_freelance",
				name: "Freelance",
				icon: "Laptop",
				color: "#3b82f6",
				type: "income",
			},
			{
				id: "seed_income_invest",
				name: "Investment",
				icon: "TrendingUp",
				color: "#10b981",
				type: "income",
			},
			// ── Expense ─────────────────────────────────────────────────────────
			{
				id: "seed_exp_food",
				name: "Food & Dining",
				icon: "Utensils",
				color: "#f97316",
				type: "expense",
			},
			{
				id: "seed_exp_transport",
				name: "Transportation",
				icon: "Car",
				color: "#0ea5e9",
				type: "expense",
			},
			{
				id: "seed_exp_shopping",
				name: "Shopping",
				icon: "ShoppingBag",
				color: "#a855f7",
				type: "expense",
			},
			{
				id: "seed_exp_entertainment",
				name: "Entertainment",
				icon: "Film",
				color: "#ec4899",
				type: "expense",
			},
			{
				id: "seed_exp_health",
				name: "Health",
				icon: "Heart",
				color: "#ef4444",
				type: "expense",
			},
			{
				id: "seed_exp_bills",
				name: "Bills & Utilities",
				icon: "Zap",
				color: "#eab308",
				type: "expense",
			},
			{
				id: "seed_exp_housing",
				name: "Housing",
				icon: "Home",
				color: "#6366f1",
				type: "expense",
			},
			{
				id: "seed_exp_education",
				name: "Education",
				icon: "Book",
				color: "#06b6d4",
				type: "expense",
			},
			// ── Savings ─────────────────────────────────────────────────────────
			{
				id: "seed_sav_emergency",
				name: "Emergency Fund",
				icon: "PiggyBank",
				color: "#22c55e",
				type: "savings",
			},
			{
				id: "seed_sav_vacation",
				name: "Vacation",
				icon: "Plane",
				color: "#f59e0b",
				type: "savings",
			},
			// ── Transfer ────────────────────────────────────────────────────────
			{
				id: "seed_transfer",
				name: "Transfer",
				icon: "Wallet",
				color: "#64748b",
				type: "transfer",
			},
		])
		.onConflictDoNothing()
		.returning();
}
