import type * as schema from "@finance-tracker/db";
import { categories } from "@finance-tracker/db";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

type Db = BetterSQLite3Database<typeof schema>;

export function getCategories(db: Db) {
	return db.select().from(categories);
}

export function createCategory(
	db: Db,
	input: {
		name: string;
		icon?: string;
		color?: string;
		type: "income" | "expense" | "transfer" | "savings";
	},
) {
	return db.insert(categories).values(input).returning();
}

export function deleteCategory(db: Db, id: string) {
	return db.delete(categories).where(eq(categories.id, id));
}
