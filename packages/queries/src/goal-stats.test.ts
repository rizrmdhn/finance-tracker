import { beforeEach, describe, expect, test } from "bun:test";
import { exchangeRates } from "@finance-tracker/db";
import { addDays, startOfMonth, subMonths } from "date-fns";
import { getMonthlySurplus } from "./goal";
import {
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
