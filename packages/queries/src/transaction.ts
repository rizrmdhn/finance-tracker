import type * as schema from "@finance-tracker/db";
import { transactions } from "@finance-tracker/db";
import { between, desc, eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

type Db = BetterSQLite3Database<typeof schema>;

export function getTransactions(
	db: Db,
	filters?: { from?: number; to?: number },
) {
	if (filters?.from && filters?.to) {
		return db
			.select()
			.from(transactions)
			.where(between(transactions.date, filters.from, filters.to))
			.orderBy(desc(transactions.date));
	}
	return db.select().from(transactions).orderBy(desc(transactions.date));
}

export function createTransaction(
	db: Db,
	input: {
		type: "income" | "expense";
		amount: number;
		note?: string;
		categoryId?: string;
		tags?: string[];
		date: number;
	},
) {
	return db
		.insert(transactions)
		.values({
			...input,
			tags: input.tags ? JSON.stringify(input.tags) : null,
		})
		.returning();
}

export function updateTransaction(
	db: Db,
	input: {
		id: string;
		type?: "income" | "expense";
		amount?: number;
		note?: string;
		categoryId?: string;
		tags?: string[];
		date?: number;
	},
) {
	const { id, tags, ...rest } = input;
	return db
		.update(transactions)
		.set({ ...rest, tags: tags ? JSON.stringify(tags) : undefined })
		.where(eq(transactions.id, id))
		.returning();
}

export function deleteTransaction(db: Db, id: string) {
	return db.delete(transactions).where(eq(transactions.id, id));
}

export function getTransactionSummary(
	db: Db,
	range: { from: number; to: number },
) {
	return db
		.select({
			type: transactions.type,
			total: sql<number>`SUM(${transactions.amount})`,
		})
		.from(transactions)
		.where(between(transactions.date, range.from, range.to))
		.groupBy(transactions.type);
}
