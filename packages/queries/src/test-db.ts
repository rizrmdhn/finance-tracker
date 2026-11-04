import { Database } from "bun:sqlite";
import type { CategoryType } from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
import type { GoalInput } from "@finance-tracker/schema";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

export const baseGoal: GoalInput = {
	name: "iPhone 17",
	icon: "Gift",
	color: "#ef4444",
	targetAmount: 15_000_000,
	currency: "IDR",
	allocationPercent: 50,
	priority: 0,
};

/** Fresh in-memory database with all migrations applied (no cr-sqlite). */
export function createTestDb() {
	const db = drizzle(new Database(":memory:"), { schema });
	migrate(db, {
		migrationsFolder: `${import.meta.dir}/../../db/migrations`,
	});
	return db;
}

export type TestDb = ReturnType<typeof createTestDb>;

export async function seedAccount(
	db: TestDb,
	values: Partial<typeof schema.accounts.$inferInsert> = {},
) {
	const [account] = await db
		.insert(schema.accounts)
		.values({ name: "Account", ...values })
		.returning();
	if (!account) throw new Error("Failed to seed account");
	return account;
}

export async function seedCategory(db: TestDb, type: CategoryType) {
	const [category] = await db
		.insert(schema.categories)
		.values({ name: type, type })
		.returning();
	if (!category) throw new Error("Failed to seed category");
	return category;
}

export async function seedTransaction(
	db: TestDb,
	values: typeof schema.transactions.$inferInsert,
) {
	const [transaction] = await db
		.insert(schema.transactions)
		.values(values)
		.returning();
	if (!transaction) throw new Error("Failed to seed transaction");
	return transaction;
}
