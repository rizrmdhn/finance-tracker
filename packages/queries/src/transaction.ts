import { type AnyDatabase, accounts, categories, transactions } from "@finance-tracker/db";
import type {
	ExportTransactionsInput,
	InfiniteTransactionsInput,
	PaginatedTransactionsInput,
	SearchTransactionsInput,
	TransactionInput,
	UpdateTransactionInput,
} from "@finance-tracker/schema";
import { and, asc, between, desc, eq, gt, gte, like, lt, lte, or } from "drizzle-orm";
import { NotFoundError } from "./errors";
import { getOffsetPaginated } from "./utils/get-offset-paginated";

export async function getTransactions(
	db: AnyDatabase,
	filters?: { from?: number; to?: number; accountId?: string },
) {
	const accountFilter = filters?.accountId
		? or(
				eq(transactions.accountId, filters.accountId),
				eq(transactions.toAccountId, filters.accountId),
			)
		: undefined;

	const dateFilter =
		filters?.from && filters?.to
			? between(transactions.date, filters.from, filters.to)
			: undefined;

	return await db.query.transactions.findMany({
		where: and(accountFilter, dateFilter),
		orderBy: desc(transactions.date),
	});
}

export async function getTransactionById(db: AnyDatabase, id: string) {
	return await db.query.transactions.findFirst({
		where: eq(transactions.id, id),
	});
}

export async function getOffsetPaginatedTransactions(
	db: AnyDatabase,
	input: PaginatedTransactionsInput,
) {
	return await getOffsetPaginated({
		db,
		table: transactions,
		input,
		conditions: [],
	});
}

export async function createTransaction(
	db: AnyDatabase,
	input: TransactionInput,
) {
	const [result] = await db
		.insert(transactions)
		.values({
			...input,
			tags: input.tags ? JSON.stringify(input.tags) : null,
		})
		.returning();

	if (!result) {
		throw new Error("Failed to create transaction");
	}

	return result;
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

	const [result] = await db
		.update(transactions)
		.set({ ...rest, tags: tags ? JSON.stringify(tags) : undefined })
		.where(eq(transactions.id, id))
		.returning();

	if (!result) {
		throw new Error("Failed to update transaction");
	}

	return result;
}

export async function deleteTransaction(db: AnyDatabase, id: string) {
	const isExist = await getTransactionById(db, id);

	if (!isExist) {
		throw new NotFoundError("Transaction", id);
	}

	const [result] = await db
		.delete(transactions)
		.where(eq(transactions.id, id))
		.returning();

	if (!result) {
		throw new Error("Failed to delete transaction");
	}

	return result;
}

export async function getAllFilteredTransactions(
	db: AnyDatabase,
	input: ExportTransactionsInput,
) {
	const result = await getOffsetPaginated({
		db,
		table: transactions,
		input: { ...input, page: 1, limit: 100_000 },
		conditions: [],
	});
	return result.data as (typeof transactions.$inferSelect)[];
}

export async function getTransactionSummary(
	db: AnyDatabase,
	input: { accountId?: string; from: number; to: number },
) {
	const accountFilter = input.accountId
		? or(
				eq(transactions.accountId, input.accountId),
				eq(transactions.toAccountId, input.accountId),
			)
		: undefined;

	const [result, allAccounts] = await Promise.all([
		db.query.transactions.findMany({
			where: and(
				accountFilter,
				between(transactions.date, input.from, input.to),
			),
			with: { category: true },
			orderBy: desc(transactions.date),
		}),
		input.accountId
			? db
					.select({ initialBalance: accounts.initialBalance })
					.from(accounts)
					.where(eq(accounts.id, input.accountId))
			: db.select({ initialBalance: accounts.initialBalance }).from(accounts),
	]);

	const initialBalance = allAccounts.reduce(
		(sum, a) => sum + a.initialBalance,
		0,
	);

	const summary = {
		income: 0,
		expense: 0,
		transfer: 0,
		savings: 0,
		balance: initialBalance,
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
				if (input.accountId) {
					const isDestination = item.toAccountId === input.accountId;
					summary.balance += isDestination ? item.amount : -item.amount;
				}
				break;
		}
	});

	return summary;
}

export async function searchTransactions(
	db: AnyDatabase,
	input: SearchTransactionsInput,
) {
	const { query, limit } = input;
	const term = `%${query}%`;

	const numericQuery = Number(query);
	const isNumeric = query.trim() !== "" && !Number.isNaN(numericQuery);

	const rows = await db
		.select({ transaction: transactions, category: categories })
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			or(
				like(transactions.note, term),
				like(categories.name, term),
				...(isNumeric ? [eq(transactions.amount, numericQuery)] : []),
			),
		)
		.orderBy(desc(transactions.date))
		.limit(limit);

	return rows.map((row) => ({ ...row.transaction, category: row.category ?? null }));
}

export async function getInfiniteTransactions(
	db: AnyDatabase,
	input: InfiniteTransactionsInput,
) {
	const fetchLimit = input.limit + 1;

	// Decode compound cursor: "date|id"
	let cursorDate: number | undefined;
	let cursorId: string | undefined;
	if (input.cursor) {
		const separatorIdx = input.cursor.indexOf("|");
		if (separatorIdx !== -1) {
			cursorDate = Number(input.cursor.slice(0, separatorIdx));
			cursorId = input.cursor.slice(separatorIdx + 1);
		}
	}

	const accountCondition = input.accountId
		? or(
				eq(transactions.accountId, input.accountId),
				eq(transactions.toAccountId, input.accountId),
			)
		: undefined;

	const dateRangeCondition =
		input.from !== undefined && input.to !== undefined
			? between(transactions.date, input.from, input.to)
			: input.from !== undefined
				? gte(transactions.date, input.from)
				: input.to !== undefined
					? lte(transactions.date, input.to)
					: undefined;

	// Compound cursor: (date < cursorDate) OR (date = cursorDate AND id > cursorId)
	// This correctly handles pagination when sorted by date DESC, id ASC
	const cursorCondition =
		cursorDate !== undefined && cursorId !== undefined
			? or(
					lt(transactions.date, cursorDate),
					and(eq(transactions.date, cursorDate), gt(transactions.id, cursorId)),
				)
			: undefined;

	const result = await db.query.transactions.findMany({
		where: and(cursorCondition, dateRangeCondition, accountCondition),
		orderBy: [desc(transactions.date), asc(transactions.id)],
		limit: fetchLimit,
		with: {
			category: true,
		},
	});

	const hasMore = result.length > input.limit;
	const items = hasMore ? result.slice(0, input.limit) : result;
	const lastItem = items[items.length - 1];
	const nextCursor =
		hasMore && lastItem ? `${lastItem.date}|${lastItem.id}` : null;

	return { data: items, nextCursor, hasMore };
}
