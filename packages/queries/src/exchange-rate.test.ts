import { beforeEach, describe, expect, test } from "bun:test";
import { exchangeRateHistory } from "@finance-tracker/db";
import {
	getRateHistory,
	getRateHistoryCoverage,
	upsertRateHistory,
} from "./exchange-rate";
import { createTestDb, type TestDb } from "./test-db";

let db: TestDb;

beforeEach(() => {
	db = createTestDb();
});

describe("upsertRateHistory / getRateHistory", () => {
	test("returns rows inside the range, oldest first", async () => {
		await upsertRateHistory(db, [
			{ target: "USD", date: "2026-05-04", rate: 1.12, fetchedAt: 1 },
			{ target: "USD", date: "2026-05-01", rate: 1.13, fetchedAt: 1 },
			{ target: "IDR", date: "2026-05-01", rate: 18_700, fetchedAt: 1 },
			{ target: "USD", date: "2026-04-30", rate: 1.14, fetchedAt: 1 },
			{ target: "USD", date: "2026-05-05", rate: 1.11, fetchedAt: 1 },
		]);

		const rows = await getRateHistory(db, {
			from: "2026-05-01",
			to: "2026-05-04",
		});
		expect(rows.map((r) => r.date)).toEqual([
			"2026-05-01",
			"2026-05-01",
			"2026-05-04",
		]);
		expect(rows).toContainEqual({
			target: "IDR",
			date: "2026-05-01",
			rate: 18_700,
		});
	});

	test("replaces the rate and fetchedAt of an existing day", async () => {
		await upsertRateHistory(db, [
			{ target: "USD", date: "2026-05-01", rate: 1.13, fetchedAt: 1 },
		]);
		await upsertRateHistory(db, [
			{ target: "USD", date: "2026-05-01", rate: 1.15, fetchedAt: 2 },
		]);

		expect(await db.select().from(exchangeRateHistory)).toEqual([
			{ target: "USD", date: "2026-05-01", rate: 1.15, fetchedAt: 2 },
		]);
	});

	test("accepts more rows than one INSERT can bind and nothing at all", async () => {
		const rows = Array.from({ length: 2500 }, (_, i) => ({
			target: "USD" as const,
			date: `D${String(i).padStart(4, "0")}`,
			rate: i,
			fetchedAt: 1,
		}));
		await upsertRateHistory(db, rows);
		await upsertRateHistory(db, []);

		expect(await db.$count(exchangeRateHistory)).toBe(2500);
	});
});

describe("getRateHistoryCoverage", () => {
	test("is null without history", async () => {
		expect(await getRateHistoryCoverage(db)).toBeNull();
	});

	test("spans the oldest to the latest day, with when the latest day was fetched", async () => {
		await upsertRateHistory(db, [
			{ target: "USD", date: "2026-05-01", rate: 1.13, fetchedAt: 500 },
			{ target: "USD", date: "2026-05-04", rate: 1.12, fetchedAt: 100 },
			{ target: "IDR", date: "2026-05-04", rate: 18_700, fetchedAt: 200 },
		]);

		expect(await getRateHistoryCoverage(db)).toEqual({
			minDate: "2026-05-01",
			maxDate: "2026-05-04",
			lastFetchedAt: 200,
		});
	});
});
