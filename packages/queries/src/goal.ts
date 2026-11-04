import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	type AnyDatabase,
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
import { and, asc, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { NotFoundError } from "./errors";
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
		const [goal] = await db.insert(goals).values(data).returning();

		if (!goal) throw new Error("Failed to create goal");

		if (initialFund) {
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
