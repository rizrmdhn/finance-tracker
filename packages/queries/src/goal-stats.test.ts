import { beforeEach, describe, expect, test } from "bun:test";
import { exchangeRates, goals } from "@finance-tracker/db";
import { addDays, startOfMonth, subMonths } from "date-fns";
import { eq } from "drizzle-orm";
import {
	addGoalContribution,
	createGoal,
	deleteGoalContribution,
	getGoalMonthlyProgress,
	getGoalProgress,
	getMonthlySurplus,
} from "./goal";
import {
	baseGoal,
	createTestDb,
	seedAccount,
	seedCategory,
	seedTransaction,
	type TestDb,
} from "./test-db";

/** A date in the middle of the month `monthsAgo` months before the current one. */
function midMonth(monthsAgo: number) {
	return addDays(startOfMonth(subMonths(new Date(), monthsAgo)), 10).getTime();
}

function monthStart(monthsAgo: number) {
	return startOfMonth(subMonths(new Date(), monthsAgo)).getTime();
}

let db: TestDb;

beforeEach(() => {
	db = createTestDb();
});

describe("getMonthlySurplus", () => {
	test("returns nothing without transactions", async () => {
		expect(
			await getMonthlySurplus(db, { months: 6, displayCurrency: "IDR" }),
		).toEqual([]);
	});

	test("counts income − expense only, ignores savings, transfers, deleted and the current month", async () => {
		const account = await seedAccount(db);
		const other = await seedAccount(db);
		const income = await seedCategory(db, "income");
		const expense = await seedCategory(db, "expense");
		const savings = await seedCategory(db, "savings");
		const transfer = await seedCategory(db, "transfer");
		const base = { accountId: account.id, date: midMonth(1) };

		await seedTransaction(db, { ...base, amount: 1000, categoryId: income.id });
		await seedTransaction(db, { ...base, amount: 300, categoryId: expense.id });
		await seedTransaction(db, { ...base, amount: 200, categoryId: savings.id });
		await seedTransaction(db, {
			...base,
			amount: 500,
			categoryId: transfer.id,
			toAccountId: other.id,
		});
		await seedTransaction(db, {
			...base,
			amount: 999,
			categoryId: income.id,
			deletedAt: new Date().toISOString(),
		});
		await seedTransaction(db, {
			...base,
			amount: 50,
			categoryId: income.id,
			date: midMonth(0),
		});

		expect(
			await getMonthlySurplus(db, { months: 6, displayCurrency: "IDR" }),
		).toEqual([
			{ month: monthStart(1), income: 1000, expense: 300, surplus: 700 },
		]);
	});

	test("starts at the month of the first transaction and fills empty months with 0", async () => {
		const account = await seedAccount(db);
		const income = await seedCategory(db, "income");
		await seedTransaction(db, {
			accountId: account.id,
			categoryId: income.id,
			amount: 100,
			date: midMonth(3),
		});
		await seedTransaction(db, {
			accountId: account.id,
			categoryId: income.id,
			amount: 200,
			date: midMonth(1),
		});

		const result = await getMonthlySurplus(db, {
			months: 6,
			displayCurrency: "IDR",
		});
		expect(result.map((m) => [m.month, m.surplus])).toEqual([
			[monthStart(3), 100],
			[monthStart(2), 0],
			[monthStart(1), 200],
		]);
	});

	test("limits to the last N full months", async () => {
		const account = await seedAccount(db);
		const income = await seedCategory(db, "income");
		await seedTransaction(db, {
			accountId: account.id,
			categoryId: income.id,
			amount: 100,
			date: midMonth(10),
		});

		const result = await getMonthlySurplus(db, {
			months: 6,
			displayCurrency: "IDR",
		});
		expect(result).toHaveLength(6);
		expect(result[0]?.month).toBe(monthStart(6));
		expect(result[5]?.month).toBe(monthStart(1));
	});

	test("returns nothing when the first transaction is in the current month", async () => {
		const account = await seedAccount(db);
		const income = await seedCategory(db, "income");
		await seedTransaction(db, {
			accountId: account.id,
			categoryId: income.id,
			amount: 100,
			date: midMonth(0),
		});

		expect(
			await getMonthlySurplus(db, { months: 6, displayCurrency: "IDR" }),
		).toEqual([]);
	});

	test("converts each transaction from its account's currency", async () => {
		const idr = await seedAccount(db, { currency: "IDR" });
		const usd = await seedAccount(db, { currency: "USD" });
		const income = await seedCategory(db, "income");
		const expense = await seedCategory(db, "expense");
		// 1 IDR = 0.0000625 USD → 1 USD = 16,000 IDR
		await db
			.insert(exchangeRates)
			.values({ base: "IDR", target: "USD", rate: 0.0000625, fetchedAt: 0 });

		await seedTransaction(db, {
			accountId: usd.id,
			categoryId: income.id,
			amount: 100,
			date: midMonth(1),
		});
		await seedTransaction(db, {
			accountId: idr.id,
			categoryId: expense.id,
			amount: 600_000,
			date: midMonth(1),
		});

		expect(
			await getMonthlySurplus(db, { months: 6, displayCurrency: "IDR" }),
		).toEqual([
			{
				month: monthStart(1),
				income: 1_600_000,
				expense: 600_000,
				surplus: 1_000_000,
			},
		]);
	});
});

describe("getGoalProgress", () => {
	test("starts at 0 without linked account or contributions", async () => {
		const goal = await createGoal(db, baseGoal);
		expect(await getGoalProgress(db, goal.id)).toEqual({
			linkedBalance: 0,
			contributions: [],
			total: 0,
			isReached: false,
		});
	});

	test("adds the linked balance and contributions per account", async () => {
		const pocket = await seedAccount(db, { initialBalance: 1000 });
		const wallet = await seedAccount(db, { initialBalance: 50_000 });
		const income = await seedCategory(db, "income");
		const expense = await seedCategory(db, "expense");
		const transfer = await seedCategory(db, "transfer");
		const date = midMonth(1);
		await seedTransaction(db, {
			accountId: pocket.id,
			categoryId: income.id,
			amount: 500,
			date,
		});
		await seedTransaction(db, {
			accountId: pocket.id,
			categoryId: expense.id,
			amount: 200,
			date,
		});
		await seedTransaction(db, {
			accountId: wallet.id,
			toAccountId: pocket.id,
			categoryId: transfer.id,
			amount: 700,
			date,
		});
		await seedTransaction(db, {
			accountId: pocket.id,
			categoryId: income.id,
			amount: 9999,
			date,
			deletedAt: new Date().toISOString(),
		});

		const goal = await createGoal(db, {
			...baseGoal,
			targetAmount: 5000,
			linkedAccountId: pocket.id,
		});
		await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: 3000,
			date,
		});
		await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: -500,
			date,
		});
		const removed = await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: 10_000,
			date,
		});
		await deleteGoalContribution(db, removed.id);

		// 1000 + 500 − 200 + 700 = 2000 linked, 3000 − 500 = 2500 contributed
		expect(await getGoalProgress(db, goal.id)).toEqual({
			linkedBalance: 2000,
			contributions: [{ accountId: wallet.id, total: 2500 }],
			total: 4500,
			isReached: false,
		});

		await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: 500,
			date,
		});
		expect((await getGoalProgress(db, goal.id)).isReached).toBe(true);
	});

	test("converts to the goal's currency", async () => {
		const pocket = await seedAccount(db, {
			currency: "USD",
			initialBalance: 10,
		});
		const wallet = await seedAccount(db, {
			currency: "USD",
			initialBalance: 100,
		});
		await db
			.insert(exchangeRates)
			.values({ base: "IDR", target: "USD", rate: 0.0000625, fetchedAt: 0 });

		const goal = await createGoal(db, {
			...baseGoal,
			currency: "IDR",
			linkedAccountId: pocket.id,
		});
		await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: 5,
			date: midMonth(1),
		});

		expect(await getGoalProgress(db, goal.id)).toMatchObject({
			linkedBalance: 160_000,
			contributions: [{ accountId: wallet.id, total: 80_000 }],
			total: 240_000,
		});
	});
});

describe("getGoalMonthlyProgress", () => {
	async function createGoalAt(monthsAgo: number, linkedAccountId?: string) {
		const goal = await createGoal(db, { ...baseGoal, linkedAccountId });
		await db
			.update(goals)
			.set({ createdAt: new Date(midMonth(monthsAgo)).toISOString() })
			.where(eq(goals.id, goal.id));
		return goal;
	}

	test("is empty for a goal created this month", async () => {
		const goal = await createGoalAt(0);
		expect(await getGoalMonthlyProgress(db, goal.id)).toEqual([]);
	});

	test("sums linked balance change and contributions per full month since creation", async () => {
		const pocket = await seedAccount(db, { initialBalance: 1_000_000 });
		const wallet = await seedAccount(db, { initialBalance: 1_000_000 });
		const transfer = await seedCategory(db, "transfer");
		const expense = await seedCategory(db, "expense");
		const goal = await createGoalAt(2, pocket.id);

		// before creation: ignored
		await seedTransaction(db, {
			accountId: wallet.id,
			toAccountId: pocket.id,
			categoryId: transfer.id,
			amount: 999,
			date: midMonth(3),
		});
		await seedTransaction(db, {
			accountId: wallet.id,
			toAccountId: pocket.id,
			categoryId: transfer.id,
			amount: 300,
			date: midMonth(2),
		});
		await seedTransaction(db, {
			accountId: pocket.id,
			categoryId: expense.id,
			amount: 50,
			date: midMonth(2),
		});
		// unrelated account: ignored
		await seedTransaction(db, {
			accountId: wallet.id,
			categoryId: expense.id,
			amount: 777,
			date: midMonth(1),
		});
		await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: 400,
			date: midMonth(1),
		});
		// current month: excluded
		await addGoalContribution(db, {
			goalId: goal.id,
			accountId: wallet.id,
			amount: 123,
			date: midMonth(0),
		});

		expect(await getGoalMonthlyProgress(db, goal.id)).toEqual([
			{ month: monthStart(2), amount: 250 },
			{ month: monthStart(1), amount: 400 },
		]);
	});

	test("keeps at most the last 6 months", async () => {
		const goal = await createGoalAt(10);
		const result = await getGoalMonthlyProgress(db, goal.id);
		expect(result.map((m) => m.month)).toEqual(
			[6, 5, 4, 3, 2, 1].map(monthStart),
		);
	});
});
