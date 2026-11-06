import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { exchangeRateHistory, exchangeRates } from "@finance-tracker/db";
import { getRangeDates } from "@finance-tracker/utils";
import { format, subDays } from "date-fns";
import {
	ensureRateHistory,
	getPairHistory,
	getRateHistory,
	getRateHistoryCoverage,
	getRatesOverview,
	upsertRateHistory,
} from "./exchange-rate";
import { createTestDb, type TestDb } from "./test-db";

const HOUR = 1000 * 60 * 60;

/** `YYYY-MM-DD` of the local day `n` days ago. */
function daysAgo(n: number) {
	return format(subDays(new Date(), n), "yyyy-MM-dd");
}

let db: TestDb;
const realFetch = globalThis.fetch;

beforeEach(() => {
	db = createTestDb();
});

afterEach(() => {
	globalThis.fetch = realFetch;
});

/** Answers every history request with USD = 1.25 per requested `from`/`to` day. */
function mockHistoryFetch() {
	const fn = mock(async (url: string) => {
		const params = new URL(url).searchParams;
		return Response.json(
			[params.get("from"), params.get("to")].map((date) => ({
				date,
				base: "EUR",
				quote: "USD",
				rate: 1.25,
			})),
		);
	});
	globalThis.fetch = fn as unknown as typeof fetch;
	return fn;
}

function requestedSpans(fn: ReturnType<typeof mockHistoryFetch>) {
	return fn.mock.calls.map(([url]) => {
		const params = new URL(url).searchParams;
		return { from: params.get("from"), to: params.get("to") };
	});
}

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

describe("ensureRateHistory", () => {
	test("fetches and stores the whole range without history", async () => {
		const fn = mockHistoryFetch();

		const spans = await ensureRateHistory(db, { range: "1M" });

		const expected = getRangeDates("1M", new Date());
		expect(spans).toEqual([expected]);
		expect(requestedSpans(fn)).toEqual([expected]);
		expect(await db.$count(exchangeRateHistory)).toBe(2);
	});

	test("fetches nothing when the range is covered and the tail is fresh", async () => {
		await upsertRateHistory(db, [
			{ target: "USD", date: daysAgo(40), rate: 1.2, fetchedAt: Date.now() },
			{ target: "USD", date: daysAgo(0), rate: 1.2, fetchedAt: Date.now() },
		]);
		const fn = mockHistoryFetch();

		expect(await ensureRateHistory(db, { range: "1M" })).toEqual([]);
		expect(fn).not.toHaveBeenCalled();
	});

	test("refetches a fresh tail when forced", async () => {
		const fetchedAt = Date.now() - HOUR;
		await upsertRateHistory(db, [
			{ target: "USD", date: daysAgo(40), rate: 1.2, fetchedAt },
			{ target: "USD", date: daysAgo(2), rate: 1.2, fetchedAt },
		]);
		const fn = mockHistoryFetch();

		await ensureRateHistory(db, { range: "1M", force: true });

		expect(requestedSpans(fn)).toEqual([{ from: daysAgo(2), to: daysAgo(0) }]);
		expect((await getRateHistoryCoverage(db))?.maxDate).toBe(daysAgo(0));
	});

	test("keeps the cached history when the fetch fails", async () => {
		await upsertRateHistory(db, [
			{ target: "USD", date: daysAgo(2), rate: 1.2, fetchedAt: 0 },
		]);
		globalThis.fetch = mock(
			async () => new Response("", { status: 500 }),
		) as unknown as typeof fetch;

		await expect(ensureRateHistory(db, { range: "1M" })).rejects.toThrow();
		expect(await db.$count(exchangeRateHistory)).toBe(1);
	});
});

async function seedPairHistory() {
	await upsertRateHistory(
		db,
		[
			{ target: "USD" as const, date: daysAgo(40), rate: 1 },
			{ target: "IDR" as const, date: daysAgo(40), rate: 1 },
			{ target: "USD" as const, date: daysAgo(3), rate: 1.25 },
			{ target: "IDR" as const, date: daysAgo(3), rate: 20_000 },
			{ target: "USD" as const, date: daysAgo(1), rate: 1.2 },
			{ target: "IDR" as const, date: daysAgo(1), rate: 20_400 },
		].map((row) => ({ ...row, fetchedAt: 1000 })),
	);
}

describe("getPairHistory", () => {
	test("returns the cached pair series over the range with latest rate and change", async () => {
		await seedPairHistory();

		const result = await getPairHistory(db, {
			base: "USD",
			quote: "IDR",
			range: "1M",
		});
		expect(result.series).toEqual([
			{ date: daysAgo(3), rate: 16_000 },
			{ date: daysAgo(1), rate: 17_000 },
		]);
		expect(result.latestRate).toBe(17_000);
		expect(result.latestDate).toBe(daysAgo(1));
		expect(result.changePercent).toBeCloseTo(6.25);
	});

	test("is empty without history", async () => {
		expect(
			await getPairHistory(db, { base: "USD", quote: "IDR", range: "1M" }),
		).toEqual({
			series: [],
			latestRate: null,
			latestDate: null,
			changePercent: null,
		});
	});
});

describe("getRatesOverview", () => {
	test("lists every other currency against the display currency", async () => {
		await seedPairHistory();
		// 1 IDR = 0.00008 SGD → 1 SGD = 12,500 IDR, no SGD history
		await db.insert(exchangeRates).values({
			base: "IDR",
			target: "SGD",
			rate: 0.00008,
			fetchedAt: 5000,
		});

		const result = await getRatesOverview(db, {
			displayCurrency: "IDR",
			range: "1M",
		});
		const byCurrency = new Map(result.currencies.map((c) => [c.currency, c]));

		expect([...byCurrency.keys()]).toEqual([
			"USD",
			"SGD",
			"MYR",
			"EUR",
			"GBP",
			"JPY",
			"AUD",
		]);
		expect(byCurrency.get("USD")).toEqual({
			currency: "USD",
			rate: 17_000,
			changePercent: expect.closeTo(6.25),
			sparkline: [16_000, 17_000],
			latestDate: daysAgo(1),
		});
		expect(byCurrency.get("EUR")?.sparkline).toEqual([20_000, 20_400]);
		expect(byCurrency.get("SGD")).toEqual({
			currency: "SGD",
			rate: expect.closeTo(12_500),
			changePercent: null,
			sparkline: [],
			latestDate: null,
		});
		expect(byCurrency.get("JPY")?.rate).toBeNull();
		expect(result.updatedAt).toBe(1000);
		expect(result.isStale).toBe(true);
	});

	test("falls back to the latest rates' fetch time without history", async () => {
		const fetchedAt = Date.now();
		await db.insert(exchangeRates).values([
			{ base: "IDR", target: "USD", rate: 0.00006, fetchedAt },
			{
				base: "IDR",
				target: "SGD",
				rate: 0.00008,
				fetchedAt: fetchedAt - HOUR,
			},
		]);

		const result = await getRatesOverview(db, {
			displayCurrency: "IDR",
			range: "1M",
		});
		expect(result.updatedAt).toBe(fetchedAt - HOUR);
		expect(result.isStale).toBe(false);
	});

	test("is stale without any rates", async () => {
		const result = await getRatesOverview(db, {
			displayCurrency: "IDR",
			range: "1M",
		});
		expect(result.updatedAt).toBeNull();
		expect(result.isStale).toBe(true);
	});
});
