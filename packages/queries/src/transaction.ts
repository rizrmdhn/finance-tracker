import type * as schema from "@finance-tracker/db";
import { transactions } from "@finance-tracker/db";
import type { TransactionInput, UpdateTransactionInput } from "@finance-tracker/schema";
import { between, desc, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { NotFoundError } from "./errors";

type Db = BetterSQLite3Database<typeof schema>;

export async function getTransactions(
	db: Db,
	filters?: { from?: number; to?: number },
) {
	if (filters?.from && filters?.to) {
		return await db
			.select()
			.from(transactions)
			.where(between(transactions.date, filters.from, filters.to))
			.orderBy(desc(transactions.date));
	}
	return await db.select().from(transactions).orderBy(desc(transactions.date));
}

export async function getTransactionById(db: Db, id: string) {
	return await db.query.transactions.findFirst({
		where: eq(transactions.id, id),
	});
}

export async function createTransaction(db: Db, input: TransactionInput) {
	return await db
		.insert(transactions)
		.values({
			...input,
			tags: input.tags ? JSON.stringify(input.tags) : null,
		})
		.returning();
}

export async function updateTransaction(
	db: Db,
	input: UpdateTransactionInput,
) {
	const { id, tags, ...rest } = input;

	const isExist = await getTransactionById(db, id);

	if (!isExist) {
		throw new NotFoundError("Transaction", id);
	}

	return await db
		.update(transactions)
		.set({ ...rest, tags: tags ? JSON.stringify(tags) : undefined })
		.where(eq(transactions.id, id))
		.returning();
}

export async function deleteTransaction(db: Db, id: string) {
	return await db.delete(transactions).where(eq(transactions.id, id));
}

export async function getTransactionSummary(
	db: Db,
	range: { from: number; to: number },
) {
	const result = await db.query.transactions.findMany({
		where: between(transactions.date, range.from, range.to),
		with: {
			category: true,
		},
		orderBy: desc(transactions.date),
	});

	const summary = {
		income: 0,
		expense: 0,
		balance: 0,
	};

	result.forEach((item) => {
		if (item.category?.type === "income") {
			summary.income += item.amount;
			summary.balance += item.amount;
		} else if (item.category?.type === "expense") {
			summary.expense += item.amount;
			summary.balance -= item.amount;
		}
	});

	return summary;
}
