import type { AnyDatabase } from "@finance-tracker/db";
import { transactions } from "@finance-tracker/db";
import type {
	TransactionInput,
	UpdateTransactionInput,
} from "@finance-tracker/schema";
import { between, desc, eq } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function getTransactions(
	db: AnyDatabase,
	filters?: { from?: number; to?: number },
) {
	if (filters?.from && filters?.to) {
		const result = await db.query.transactions.findMany({
			where: between(transactions.date, filters.from, filters.to),
			orderBy: desc(transactions.date),
		});
		return result;
	}

	return await db.query.transactions.findMany({
		orderBy: desc(transactions.date),
	});
}

export async function getTransactionById(db: AnyDatabase, id: string) {
	return await db.query.transactions.findFirst({
		where: eq(transactions.id, id),
	});
}

export async function createTransaction(
	db: AnyDatabase,
	input: TransactionInput,
) {
	return await db
		.insert(transactions)
		.values({
			...input,
			tags: input.tags ? JSON.stringify(input.tags) : null,
		})
		.returning();
}

export async function updateTransaction(
	db: AnyDatabase,
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

export async function deleteTransaction(db: AnyDatabase, id: string) {
	return await db.delete(transactions).where(eq(transactions.id, id));
}

export async function getTransactionSummary(
	db: AnyDatabase,
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
		transfer: 0,
		savings: 0,
		balance: 0,
	};

	result.forEach((item) => {
		switch (item.category?.type) {
			case "income":
				summary.income += item.amount;
				summary.balance += item.amount;
				break;
			case "expense":
				summary.expense += item.amount;
				summary.balance -= item.amount;
				break;
			case "savings":
				summary.savings += item.amount;
				summary.balance -= item.amount;
				break;
			case "transfer":
				summary.transfer += item.amount;
				break;
		}
	});

	return summary;
}
