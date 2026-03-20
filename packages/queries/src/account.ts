import { type AnyDatabase, accounts } from "@finance-tracker/db";
import type { AccountInput, AccountUpdateInput } from "@finance-tracker/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function getAccounts(db: AnyDatabase) {
	return await db.query.accounts.findMany();
}

export async function getAccountsWithBalance(db: AnyDatabase) {
	const allAccounts = await db.query.accounts.findMany();
	const allTransactions = await db.query.transactions.findMany({
		with: { category: true },
	});

	const balanceMap = new Map<string, number>();
	for (const tx of allTransactions) {
		const type = tx.category?.type;
		let delta = 0;
		if (type === "income") delta = tx.amount;
		else if (type === "expense" || type === "savings") delta = -tx.amount;
		else if (type === "transfer") {
			delta = -tx.amount;
			if (tx.toAccountId) {
				balanceMap.set(
					tx.toAccountId,
					(balanceMap.get(tx.toAccountId) ?? 0) + tx.amount,
				);
			}
		}
		balanceMap.set(tx.accountId, (balanceMap.get(tx.accountId) ?? 0) + delta);
	}

	return allAccounts.map((account) => ({
		...account,
		balance: account.initialBalance + (balanceMap.get(account.id) ?? 0),
	}));
}

export async function getAccountById(db: AnyDatabase, id: string) {
	return await db.query.accounts.findFirst({
		where: eq(accounts.id, id),
	});
}

export async function createAccount(db: AnyDatabase, input: AccountInput) {
	return await db.insert(accounts).values(input).returning();
}

export async function deleteAccount(db: AnyDatabase, id: string) {
	const isExist = await getAccountById(db, id);

	if (!isExist) {
		throw new NotFoundError("Account", id);
	}

	return await db.delete(accounts).where(eq(accounts.id, id));
}

export async function updateAccount(
	db: AnyDatabase,
	input: AccountUpdateInput,
) {
	const isExist = await getAccountById(db, input.id);

	if (!isExist) {
		throw new NotFoundError("Account", input.id);
	}

	return await db
		.update(accounts)
		.set(input)
		.where(eq(accounts.id, input.id))
		.returning();
}
