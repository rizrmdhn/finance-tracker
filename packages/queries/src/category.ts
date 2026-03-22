import type { AnyDatabase } from "@finance-tracker/db";
import { categories } from "@finance-tracker/db";
import type {
	CategoryInput,
	CategoryUpdateInput,
} from "@finance-tracker/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function getCategories(db: AnyDatabase) {
	return await db.query.categories.findMany();
}

export async function getCategoryById(db: AnyDatabase, id: string) {
	return await db.query.categories.findFirst({
		where: eq(categories.id, id),
	});
}

export async function createCategory(db: AnyDatabase, input: CategoryInput) {
	const [result] = await db.insert(categories).values(input).returning();

	if (!result) {
		throw new Error("Failed to create category");
	}

	return result;
}

export async function updateCategory(
	db: AnyDatabase,
	input: CategoryUpdateInput,
) {
	const isExist = await getCategoryById(db, input.id);

	if (!isExist) {
		throw new NotFoundError("Category", input.id);
	}

	const [result] = await db
		.update(categories)
		.set(input)
		.where(eq(categories.id, input.id))
		.returning();

	if (!result) {
		throw new Error("Failed to update category");
	}

	return result;
}

export async function seedDefaultCategories(db: AnyDatabase) {
	return await db
		.insert(categories)
		.values([
			// ── Income ──────────────────────────────────────────────────────────
			{ id: "seed_income_salary",     name: "Salary",            icon: "Briefcase",   color: "#22c55e", type: "income"   },
			{ id: "seed_income_freelance",  name: "Freelance",         icon: "Laptop",      color: "#3b82f6", type: "income"   },
			{ id: "seed_income_invest",     name: "Investment",        icon: "TrendingUp",  color: "#10b981", type: "income"   },
			// ── Expense ─────────────────────────────────────────────────────────
			{ id: "seed_exp_food",          name: "Food & Dining",     icon: "Utensils",    color: "#f97316", type: "expense"  },
			{ id: "seed_exp_transport",     name: "Transportation",    icon: "Car",         color: "#0ea5e9", type: "expense"  },
			{ id: "seed_exp_shopping",      name: "Shopping",          icon: "ShoppingBag", color: "#a855f7", type: "expense"  },
			{ id: "seed_exp_entertainment", name: "Entertainment",     icon: "Film",        color: "#ec4899", type: "expense"  },
			{ id: "seed_exp_health",        name: "Health",            icon: "Heart",       color: "#ef4444", type: "expense"  },
			{ id: "seed_exp_bills",         name: "Bills & Utilities", icon: "Zap",         color: "#eab308", type: "expense"  },
			{ id: "seed_exp_housing",       name: "Housing",           icon: "Home",        color: "#6366f1", type: "expense"  },
			{ id: "seed_exp_education",     name: "Education",         icon: "Book",        color: "#06b6d4", type: "expense"  },
			// ── Savings ─────────────────────────────────────────────────────────
			{ id: "seed_sav_emergency",     name: "Emergency Fund",    icon: "PiggyBank",   color: "#22c55e", type: "savings"  },
			{ id: "seed_sav_vacation",      name: "Vacation",          icon: "Plane",       color: "#f59e0b", type: "savings"  },
			// ── Transfer ────────────────────────────────────────────────────────
			{ id: "seed_transfer",          name: "Transfer",          icon: "Wallet",      color: "#64748b", type: "transfer" },
		])
		.onConflictDoNothing()
		.returning();
}

export async function deleteCategory(db: AnyDatabase, id: string) {
	const isExist = await getCategoryById(db, id);

	if (!isExist) {
		throw new NotFoundError("Category", id);
	}

	const [result] = await db
		.delete(categories)
		.where(eq(categories.id, id))
		.returning();

	if (!result) {
		throw new Error("Failed to delete category");
	}

	return result;
}
