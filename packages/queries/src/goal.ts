import type {
	CategoryType,
	GoalStatus,
	SupportedCurrency,
} from "@finance-tracker/constants";
import {
	type AnyDatabase,
	accounts,
	goalContributions,
	goals,
	transactions,
} from "@finance-tracker/db";
import type {
	GoalContributionInput,
	GoalInput,
	GoalUpdateInput,
} from "@finance-tracker/schema";
import { eachMonthOfInterval, max, startOfMonth, subMonths } from "date-fns";
import { and, asc, desc, eq, gte, isNull, lt, or } from "drizzle-orm";
import {
	AccountAlreadyLinkedError,
	AccountIsContributionSourceError,
	AllocationLimitExceededError,
	GoalNotActiveError,
	InsufficientFreeBalanceError,
	LinkedAccountContributionError,
	NotFoundError,
	RelationNotFoundError,
	WithdrawalExceedsAllocationError,
} from "./errors";
import { getCachedRates } from "./exchange-rate";
import { withTransaction } from "./utils/with-transaction";

/** Converts amounts to `target` with the cached rates, like `toDisplay` in getTransactionSummary. */
async function getCurrencyConverter(
	db: AnyDatabase,
	target: SupportedCurrency,
) {
	// 1 target = rate source, so source → target is amount / rate
	const rates = new Map(
		(await getCachedRates(db, target)).map((r) => [r.target, r.rate]),
	);
	return (amount: number, source: SupportedCurrency) => {
		if (source === target) return amount;
		const rate = rates.get(source);
		return rate ? amount / rate : amount;
	};
}

/** Effect of a transaction on `accountId`'s balance (same rules as getAccountsWithBalance). */
function balanceDelta(
	tx: {
		amount: number;
		accountId: string;
		toAccountId: string | null;
		category: { type: CategoryType } | null;
	},
	accountId: string,
) {
	const type = tx.category?.type;
	if (type === "transfer")
		return (
			(tx.toAccountId === accountId ? tx.amount : 0) -
			(tx.accountId === accountId ? tx.amount : 0)
		);
	if (tx.accountId !== accountId) return 0;
	if (type === "income") return tx.amount;
	if (type === "expense" || type === "savings") return -tx.amount;
	return 0;
}

/** Current balance (in the account's own currency) of every non-deleted account. */
async function getAccountBalances(db: AnyDatabase) {
	const [allAccounts, allTransactions] = await Promise.all([
		db.query.accounts.findMany({ where: isNull(accounts.deletedAt) }),
		db.query.transactions.findMany({
			where: isNull(transactions.deletedAt),
			with: { category: true },
		}),
	]);

	const deltas = new Map<string, number>();
	const addDelta = (accountId: string, delta: number) =>
		deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
	for (const tx of allTransactions) {
		addDelta(tx.accountId, balanceDelta(tx, tx.accountId));
		if (tx.toAccountId && tx.toAccountId !== tx.accountId)
			addDelta(tx.toAccountId, balanceDelta(tx, tx.toAccountId));
	}

	return new Map(
		allAccounts.map((account) => [
			account.id,
			{
				currency: account.currency,
				balance: account.initialBalance + (deltas.get(account.id) ?? 0),
			},
		]),
	);
}

async function getActiveGoals(db: AnyDatabase) {
	return await db.query.goals.findMany({
		where: and(isNull(goals.deletedAt), eq(goals.status, "active")),
	});
}

/**
 * Contributions that hold money: neither the row nor its goal is deleted and the goal is active.
 * Purchasing / archiving a goal releases its contributions without touching them.
 */
async function getActiveAllocations(db: AnyDatabase) {
	return await db
		.select({
			goalId: goalContributions.goalId,
			accountId: goalContributions.accountId,
			amount: goalContributions.amount,
		})
		.from(goalContributions)
		.innerJoin(goals, eq(goals.id, goalContributions.goalId))
		.where(
			and(
				isNull(goalContributions.deletedAt),
				isNull(goals.deletedAt),
				eq(goals.status, "active"),
			),
		);
}

// Tolerance for float sums of amounts and percentages
const EPSILON = 1e-9;

/** Rule 1: linked to at most one active goal, and not already a contribution source. */
async function assertCanLinkAccount(
	db: AnyDatabase,
	accountId: string,
	goalId?: string,
) {
	const [account, activeGoals, allocations] = await Promise.all([
		db.query.accounts.findFirst({
			where: and(eq(accounts.id, accountId), isNull(accounts.deletedAt)),
		}),
		getActiveGoals(db),
		getActiveAllocations(db),
	]);

	if (!account) throw new RelationNotFoundError("Goal", "Account", accountId);

	const linkedGoal = activeGoals.find(
		(g) => g.id !== goalId && g.linkedAccountId === accountId,
	);
	if (linkedGoal) throw new AccountAlreadyLinkedError(accountId, linkedGoal.id);

	const allocated = allocations
		.filter((a) => a.accountId === accountId)
		.reduce((sum, a) => sum + a.amount, 0);
	if (allocated > EPSILON)
		throw new AccountIsContributionSourceError(accountId);
}

/** Rule 5: SUM(allocationPercent) of active goals ≤ 100. */
async function assertAllocationLimit(
	db: AnyDatabase,
	allocationPercent: number,
	goalId?: string,
) {
	const total = (await getActiveGoals(db))
		.filter((g) => g.id !== goalId)
		.reduce((sum, g) => sum + g.allocationPercent, allocationPercent);
	if (total > 100 + EPSILON) throw new AllocationLimitExceededError(total);
}

/**
 * Rule 2: no linked account (of any active goal, the goal's own included) as source.
 * Rule 4: a deposit fits the source's free balance; a withdrawal what the goal holds from it.
 */
async function assertCanContribute(
	db: AnyDatabase,
	goal: { id: string; status: GoalStatus },
	accountId: string,
	amount: number,
) {
	if (goal.status !== "active")
		throw new GoalNotActiveError(goal.id, goal.status);

	const [balances, activeGoals, allocations] = await Promise.all([
		getAccountBalances(db),
		getActiveGoals(db),
		getActiveAllocations(db),
	]);

	const account = balances.get(accountId);
	if (!account)
		throw new RelationNotFoundError("Goal contribution", "Account", accountId);

	if (activeGoals.some((g) => g.linkedAccountId === accountId))
		throw new LinkedAccountContributionError(accountId);

	const fromAccount = allocations.filter((a) => a.accountId === accountId);
	if (amount > 0) {
		const freeBalance =
			account.balance - fromAccount.reduce((sum, a) => sum + a.amount, 0);
		if (amount > freeBalance + EPSILON)
			throw new InsufficientFreeBalanceError(accountId, freeBalance, amount);
	} else {
		const held = fromAccount
			.filter((a) => a.goalId === goal.id)
			.reduce((sum, a) => sum + a.amount, 0);
		if (-amount > held + EPSILON)
			throw new WithdrawalExceedsAllocationError(
				goal.id,
				accountId,
				held,
				-amount,
			);
	}
}

export async function getGoals(db: AnyDatabase) {
	return await db.query.goals.findMany({
		where: isNull(goals.deletedAt),
		orderBy: [asc(goals.priority), asc(goals.createdAt)],
	});
}

export async function getGoalById(db: AnyDatabase, id: string) {
	return await db.query.goals.findFirst({
		where: and(eq(goals.id, id), isNull(goals.deletedAt)),
	});
}

export async function createGoal(db: AnyDatabase, input: GoalInput) {
	const { initialFund, ...data } = input;

	return await withTransaction(db, async () => {
		if (data.linkedAccountId)
			await assertCanLinkAccount(db, data.linkedAccountId);
		await assertAllocationLimit(db, data.allocationPercent);

		const [goal] = await db.insert(goals).values(data).returning();

		if (!goal) throw new Error("Failed to create goal");

		if (initialFund) {
			// After the insert, so the goal's own linked account is caught as a source
			await assertCanContribute(
				db,
				goal,
				initialFund.accountId,
				initialFund.amount,
			);
			await db.insert(goalContributions).values({
				goalId: goal.id,
				accountId: initialFund.accountId,
				amount: initialFund.amount,
				date: Date.now(),
			});
		}

		return goal;
	});
}

export async function updateGoal(db: AnyDatabase, input: GoalUpdateInput) {
	const { id, ...data } = input;

	const goal = await getGoalById(db, id);

	if (!goal) throw new NotFoundError("Goal", id);

	// Only re-check what the edit changes, so rule breaks merged in from other
	// devices don't block unrelated edits
	if (goal.status === "active") {
		if (data.linkedAccountId && data.linkedAccountId !== goal.linkedAccountId)
			await assertCanLinkAccount(db, data.linkedAccountId, id);
		if (
			data.allocationPercent !== undefined &&
			data.allocationPercent > goal.allocationPercent
		)
			await assertAllocationLimit(db, data.allocationPercent, id);
	}

	const [result] = await db
		.update(goals)
		.set(data)
		.where(eq(goals.id, id))
		.returning();

	if (!result) throw new Error("Failed to update goal");

	return result;
}

export async function deleteGoal(db: AnyDatabase, id: string) {
	const goal = await getGoalById(db, id);

	if (!goal) throw new NotFoundError("Goal", id);

	const [result] = await db
		.update(goals)
		.set({ deletedAt: new Date().toISOString() })
		.where(eq(goals.id, id))
		.returning();

	if (!result) throw new Error("Failed to delete goal");

	return result;
}

export async function addGoalContribution(
	db: AnyDatabase,
	input: GoalContributionInput,
) {
	const goal = await getGoalById(db, input.goalId);

	if (!goal) throw new NotFoundError("Goal", input.goalId);

	await assertCanContribute(db, goal, input.accountId, input.amount);

	const [result] = await db.insert(goalContributions).values(input).returning();

	if (!result) throw new Error("Failed to add goal contribution");

	return result;
}

export async function getGoalContributions(db: AnyDatabase, goalId: string) {
	return await db.query.goalContributions.findMany({
		where: and(
			eq(goalContributions.goalId, goalId),
			isNull(goalContributions.deletedAt),
		),
		with: { account: true },
		orderBy: desc(goalContributions.date),
	});
}

export async function deleteGoalContribution(db: AnyDatabase, id: string) {
	const contribution = await db.query.goalContributions.findFirst({
		where: and(
			eq(goalContributions.id, id),
			isNull(goalContributions.deletedAt),
		),
	});

	if (!contribution) throw new NotFoundError("Goal contribution", id);

	const [result] = await db
		.update(goalContributions)
		.set({ deletedAt: new Date().toISOString() })
		.where(eq(goalContributions.id, id))
		.returning();

	if (!result) throw new Error("Failed to delete goal contribution");

	return result;
}

/**
 * Income − expense per full month (current month excluded), oldest first, for the last
 * `months` months — but never before the month of the first transaction, so a new user
 * isn't dragged down by empty months. `savings` isn't subtracted and transfers are ignored.
 */
export async function getMonthlySurplus(
	db: AnyDatabase,
	input: { months: number; displayCurrency: SupportedCurrency },
) {
	const currentMonth = startOfMonth(new Date());

	const firstTransaction = await db.query.transactions.findFirst({
		columns: { date: true },
		where: isNull(transactions.deletedAt),
		orderBy: asc(transactions.date),
	});

	if (!firstTransaction) return [];

	const from = max([
		subMonths(currentMonth, input.months),
		startOfMonth(firstTransaction.date),
	]);

	if (from >= currentMonth) return [];

	const [periodTransactions, toDisplay] = await Promise.all([
		db.query.transactions.findMany({
			where: and(
				gte(transactions.date, from.getTime()),
				lt(transactions.date, currentMonth.getTime()),
				isNull(transactions.deletedAt),
			),
			with: { category: true, account: true },
		}),
		getCurrencyConverter(db, input.displayCurrency),
	]);

	const income = new Map<number, number>();
	const expense = new Map<number, number>();
	for (const tx of periodTransactions) {
		const totals =
			tx.category?.type === "income"
				? income
				: tx.category?.type === "expense"
					? expense
					: undefined;
		if (!totals) continue;

		const month = startOfMonth(tx.date).getTime();
		const amount = toDisplay(
			tx.amount,
			tx.account?.currency ?? input.displayCurrency,
		);
		totals.set(month, (totals.get(month) ?? 0) + amount);
	}

	return eachMonthOfInterval({
		start: from,
		end: subMonths(currentMonth, 1),
	}).map((monthStart) => {
		const month = monthStart.getTime();
		const monthIncome = income.get(month) ?? 0;
		const monthExpense = expense.get(month) ?? 0;
		return {
			month,
			income: monthIncome,
			expense: monthExpense,
			surplus: monthIncome - monthExpense,
		};
	});
}

/**
 * Progress = linked account balance + contributions, all in the goal's currency.
 * Contributions are in their source account's currency.
 */
export async function getGoalProgress(db: AnyDatabase, goalId: string) {
	const goal = await getGoalById(db, goalId);

	if (!goal) throw new NotFoundError("Goal", goalId);

	const [balances, contributionRows, toGoalCurrency] = await Promise.all([
		getAccountBalances(db),
		db.query.goalContributions.findMany({
			columns: { accountId: true, amount: true },
			where: and(
				eq(goalContributions.goalId, goalId),
				isNull(goalContributions.deletedAt),
			),
		}),
		getCurrencyConverter(db, goal.currency),
	]);

	const linked = goal.linkedAccountId
		? balances.get(goal.linkedAccountId)
		: undefined;
	const linkedBalance = linked
		? toGoalCurrency(linked.balance, linked.currency)
		: 0;

	const totals = new Map<string, number>();
	for (const row of contributionRows) {
		const currency = balances.get(row.accountId)?.currency ?? goal.currency;
		totals.set(
			row.accountId,
			(totals.get(row.accountId) ?? 0) + toGoalCurrency(row.amount, currency),
		);
	}
	const contributions = [...totals].map(([accountId, total]) => ({
		accountId,
		total,
	}));

	const total =
		linkedBalance + contributions.reduce((sum, c) => sum + c.total, 0);

	return {
		linkedBalance,
		contributions,
		total,
		isReached: total >= goal.targetAmount,
	};
}

/**
 * Monthly progress increase (goal currency), oldest first: net change of the linked account's
 * balance + contributions in that month. Full months from the goal's creation month onward,
 * current month excluded, at most the last 6.
 */
export async function getGoalMonthlyProgress(db: AnyDatabase, goalId: string) {
	const goal = await getGoalById(db, goalId);

	if (!goal) throw new NotFoundError("Goal", goalId);

	const currentMonth = startOfMonth(new Date());
	const from = max([
		subMonths(currentMonth, 6),
		startOfMonth(goal.createdAt ?? currentMonth),
	]);

	if (from >= currentMonth) return [];

	const linkedAccountId = goal.linkedAccountId;
	const [allAccounts, linkedTransactions, contributionRows, toGoalCurrency] =
		await Promise.all([
			db.query.accounts.findMany({
				columns: { id: true, currency: true },
			}),
			linkedAccountId
				? db.query.transactions.findMany({
						where: and(
							or(
								eq(transactions.accountId, linkedAccountId),
								eq(transactions.toAccountId, linkedAccountId),
							),
							gte(transactions.date, from.getTime()),
							lt(transactions.date, currentMonth.getTime()),
							isNull(transactions.deletedAt),
						),
						with: { category: true },
					})
				: Promise.resolve([]),
			db.query.goalContributions.findMany({
				where: and(
					eq(goalContributions.goalId, goalId),
					gte(goalContributions.date, from.getTime()),
					lt(goalContributions.date, currentMonth.getTime()),
					isNull(goalContributions.deletedAt),
				),
			}),
			getCurrencyConverter(db, goal.currency),
		]);

	const currencies = new Map(allAccounts.map((a) => [a.id, a.currency]));
	const increase = new Map<number, number>();
	const add = (date: number, amount: number, accountId: string) => {
		const month = startOfMonth(date).getTime();
		const converted = toGoalCurrency(
			amount,
			currencies.get(accountId) ?? goal.currency,
		);
		increase.set(month, (increase.get(month) ?? 0) + converted);
	};

	if (linkedAccountId)
		for (const tx of linkedTransactions)
			add(tx.date, balanceDelta(tx, linkedAccountId), linkedAccountId);
	for (const row of contributionRows) add(row.date, row.amount, row.accountId);

	return eachMonthOfInterval({
		start: from,
		end: subMonths(currentMonth, 1),
	}).map((monthStart) => ({
		month: monthStart.getTime(),
		amount: increase.get(monthStart.getTime()) ?? 0,
	}));
}

/**
 * Per account (amounts in the account's currency): balance, what active goals hold from it,
 * and the free rest. A linked account is fully reserved for its goal, so its free balance is 0.
 */
export async function getAccountAllocations(db: AnyDatabase) {
	const [balances, allocations, activeGoals] = await Promise.all([
		getAccountBalances(db),
		getActiveAllocations(db),
		getActiveGoals(db),
	]);

	const allocatedByAccount = new Map<string, number>();
	for (const row of allocations)
		allocatedByAccount.set(
			row.accountId,
			(allocatedByAccount.get(row.accountId) ?? 0) + row.amount,
		);

	const linkedGoalByAccount = new Map(
		activeGoals.flatMap((goal) =>
			goal.linkedAccountId ? [[goal.linkedAccountId, goal.id] as const] : [],
		),
	);

	return [...balances].map(([accountId, { balance }]) => {
		const allocated = allocatedByAccount.get(accountId) ?? 0;
		const linkedGoalId = linkedGoalByAccount.get(accountId) ?? null;
		const isLinked = linkedGoalId !== null;
		return {
			accountId,
			balance,
			allocated,
			freeBalance: isLinked ? 0 : balance - allocated,
			isLinked,
			linkedGoalId,
			// a linked account shouldn't fund other goals at all (only reachable through sync merges)
			isOverAllocated: isLinked ? allocated > 0 : allocated > balance,
		};
	});
}
