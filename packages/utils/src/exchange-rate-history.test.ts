import { describe, expect, test } from "bun:test";
import type { ExchangeRateHistoryRow } from "./exchange-rate";
import {
	buildPairSeries,
	crossRate,
	downsample,
	getChangePercent,
	getMissingHistorySpans,
	getMonthlyAverageRates,
	getRangeDates,
} from "./exchange-rate-history";

const HOUR = 1000 * 60 * 60;

describe("getRangeDates", () => {
	const today = new Date(2026, 2, 31); // 31 Mar 2026, local

	test.each([
		["1W", "2026-03-24"],
		["1M", "2026-02-28"],
		["3M", "2025-12-31"],
		["6M", "2025-09-30"],
		["1Y", "2025-03-31"],
		["5Y", "2021-03-31"],
	] as const)("%s starts on %s and ends today", (range, from) => {
		expect(getRangeDates(range, today)).toEqual({ from, to: "2026-03-31" });
	});
});

describe("getMissingHistorySpans", () => {
	const now = Date.UTC(2026, 4, 10, 12);
	const range = { from: "2026-04-01", to: "2026-05-10" };

	test("fetches the whole range without history", () => {
		expect(getMissingHistorySpans({ ...range, coverage: null, now })).toEqual([
			range,
		]);
	});

	test("fetches nothing when covered and the tail is fresh", () => {
		const coverage = {
			minDate: "2026-04-01",
			maxDate: "2026-05-08",
			lastFetchedAt: now - HOUR,
		};
		expect(getMissingHistorySpans({ ...range, coverage, now })).toEqual([]);
	});

	test("fetches the head up to the day before the cache", () => {
		const coverage = {
			minDate: "2026-05-01",
			maxDate: "2026-05-10",
			lastFetchedAt: now - HOUR,
		};
		expect(getMissingHistorySpans({ ...range, coverage, now })).toEqual([
			{ from: "2026-04-01", to: "2026-04-30" },
		]);
	});

	test("keeps the cache contiguous when the range ends before it", () => {
		const coverage = {
			minDate: "2026-06-01",
			maxDate: "2026-06-10",
			lastFetchedAt: now - HOUR,
		};
		expect(getMissingHistorySpans({ ...range, coverage, now })).toEqual([
			{ from: "2026-04-01", to: "2026-05-31" },
		]);
	});

	test("refetches the tail from the latest cached day once it is stale", () => {
		const coverage = {
			minDate: "2026-04-01",
			maxDate: "2026-05-08",
			lastFetchedAt: now - 5 * HOUR,
		};
		expect(getMissingHistorySpans({ ...range, coverage, now })).toEqual([
			{ from: "2026-05-08", to: "2026-05-10" },
		]);
	});

	test("fetches head and tail together", () => {
		const coverage = {
			minDate: "2026-04-15",
			maxDate: "2026-05-01",
			lastFetchedAt: now - 9 * 24 * HOUR,
		};
		expect(getMissingHistorySpans({ ...range, coverage, now })).toEqual([
			{ from: "2026-04-01", to: "2026-04-14" },
			{ from: "2026-05-01", to: "2026-05-10" },
		]);
	});
});

describe("crossRate", () => {
	const eurRates = { USD: 1.25, IDR: 20_000 };

	test("derives any pair from EUR-based rates", () => {
		expect(crossRate(eurRates, "USD", "IDR")).toBe(16_000);
		expect(crossRate(eurRates, "IDR", "USD")).toBe(0.0000625);
	});

	test("treats EUR as 1", () => {
		expect(crossRate(eurRates, "EUR", "USD")).toBe(1.25);
		expect(crossRate(eurRates, "USD", "EUR")).toBe(0.8);
		expect(crossRate(eurRates, "EUR", "EUR")).toBe(1);
	});

	test("is null when a leg is missing", () => {
		expect(crossRate(eurRates, "USD", "JPY")).toBeNull();
		expect(crossRate(eurRates, "SGD", "EUR")).toBeNull();
	});
});

const rows: ExchangeRateHistoryRow[] = [
	{ target: "USD", date: "2026-05-04", rate: 1.2 },
	{ target: "IDR", date: "2026-05-04", rate: 19_200 },
	{ target: "USD", date: "2026-04-30", rate: 1.25 },
	{ target: "IDR", date: "2026-04-30", rate: 20_000 },
	{ target: "USD", date: "2026-05-05", rate: 1 }, // no IDR that day
	{ target: "USD", date: "2026-04-29", rate: 1.25 },
	{ target: "IDR", date: "2026-04-29", rate: 21_250 },
];

describe("buildPairSeries", () => {
	test("keeps only days with both legs, oldest first", () => {
		expect(buildPairSeries(rows, "USD", "IDR")).toEqual([
			{ date: "2026-04-29", rate: 17_000 },
			{ date: "2026-04-30", rate: 16_000 },
			{ date: "2026-05-04", rate: 16_000 },
		]);
	});

	test("needs only one leg when EUR is involved", () => {
		expect(buildPairSeries(rows, "EUR", "USD").map((p) => p.date)).toEqual([
			"2026-04-29",
			"2026-04-30",
			"2026-05-04",
			"2026-05-05",
		]);
	});
});

describe("getChangePercent", () => {
	test("compares the first and the last point", () => {
		expect(
			getChangePercent([
				{ date: "2026-05-01", rate: 200 },
				{ date: "2026-05-02", rate: 150 },
				{ date: "2026-05-03", rate: 210 },
			]),
		).toBeCloseTo(5);
	});

	test("is null with fewer than 2 points", () => {
		expect(getChangePercent([])).toBeNull();
		expect(getChangePercent([{ date: "2026-05-01", rate: 1 }])).toBeNull();
	});
});

describe("getMonthlyAverageRates", () => {
	test("averages the daily pair rate per month", () => {
		expect(getMonthlyAverageRates(rows, "USD", "IDR")).toEqual(
			new Map([
				["2026-04", 16_500],
				["2026-05", 16_000],
			]),
		);
	});
});

describe("downsample", () => {
	test("returns short input unchanged", () => {
		expect(downsample([1, 2, 3], 5)).toEqual([1, 2, 3]);
	});

	test("keeps max evenly spaced values including the first and the last", () => {
		const values = Array.from({ length: 100 }, (_, i) => i);
		const result = downsample(values, 30);
		expect(result).toHaveLength(30);
		expect(result[0]).toBe(0);
		expect(result.at(-1)).toBe(99);
	});
});
