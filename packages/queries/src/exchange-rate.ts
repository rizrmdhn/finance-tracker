import {
	SUPPORTED_CURRENCIES,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import {
	type AnyDatabase,
	exchangeRateHistory,
	exchangeRates,
} from "@finance-tracker/db";
import type {
	ExchangeRateEnsureHistoryInput,
	ExchangeRateOverviewInput,
	ExchangeRatePairHistoryInput,
} from "@finance-tracker/schema";
import {
	buildPairSeries,
	downsample,
	fetchExchangeRateHistory,
	getChangePercent,
	getMissingHistorySpans,
	getRangeDates,
	isRateStale,
} from "@finance-tracker/utils";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { withTransaction } from "./utils/with-transaction";

/** Rows per INSERT, well under SQLite's bound-parameter limit (4 columns each). */
const HISTORY_UPSERT_CHUNK = 1000;
const SPARKLINE_POINTS = 30;

export async function getCachedRates(db: AnyDatabase, base: SupportedCurrency) {
	return await db
		.select()
		.from(exchangeRates)
		.where(eq(exchangeRates.base, base));
}

export async function getCachedRate(
	db: AnyDatabase,
	base: SupportedCurrency,
	target: SupportedCurrency,
) {
	return await db.query.exchangeRates.findFirst({
		where: and(eq(exchangeRates.base, base), eq(exchangeRates.target, target)),
	});
}

export async function upsertRates(
	db: AnyDatabase,
	rows: {
		base: SupportedCurrency;
		target: SupportedCurrency;
		rate: number;
		fetchedAt: number;
	}[],
) {
	return await db
		.insert(exchangeRates)
		.values(rows)
		.onConflictDoUpdate({
			target: [exchangeRates.base, exchangeRates.target],
			set: {
				rate: sql`excluded.rate`,
				fetchedAt: sql`excluded.fetched_at`,
			},
		})
		.returning();
}

/** EUR-based history rows with `from` <= date <= `to` (`YYYY-MM-DD`), oldest first. */
export async function getRateHistory(
	db: AnyDatabase,
	input: { from: string; to: string },
) {
	return await db
		.select({
			target: exchangeRateHistory.target,
			date: exchangeRateHistory.date,
			rate: exchangeRateHistory.rate,
		})
		.from(exchangeRateHistory)
		.where(
			and(
				gte(exchangeRateHistory.date, input.from),
				lte(exchangeRateHistory.date, input.to),
			),
		)
		.orderBy(asc(exchangeRateHistory.date));
}

export async function upsertRateHistory(
	db: AnyDatabase,
	rows: (typeof exchangeRateHistory.$inferInsert)[],
) {
	await withTransaction(db, async () => {
		for (let i = 0; i < rows.length; i += HISTORY_UPSERT_CHUNK) {
			await db
				.insert(exchangeRateHistory)
				.values(rows.slice(i, i + HISTORY_UPSERT_CHUNK))
				.onConflictDoUpdate({
					target: [exchangeRateHistory.target, exchangeRateHistory.date],
					set: {
						rate: sql`excluded.rate`,
						fetchedAt: sql`excluded.fetched_at`,
					},
				});
		}
	});
}

/**
 * The span the cached history covers (it is always fetched as one contiguous span) and when
 * its latest day was last fetched; null when there is no history yet.
 */
export async function getRateHistoryCoverage(db: AnyDatabase) {
	const [first, last] = await Promise.all([
		db.query.exchangeRateHistory.findFirst({
			columns: { date: true },
			orderBy: asc(exchangeRateHistory.date),
		}),
		db.query.exchangeRateHistory.findFirst({
			columns: { date: true, fetchedAt: true },
			orderBy: [
				desc(exchangeRateHistory.date),
				desc(exchangeRateHistory.fetchedAt),
			],
		}),
	]);

	if (!first || !last) return null;

	return {
		minDate: first.date,
		maxDate: last.date,
		lastFetchedAt: last.fetchedAt,
	};
}

/**
 * Fetches the parts of `range` the cached history lacks (see getMissingHistorySpans) and stores
 * them; returns the fetched spans. Only adds rows: when a fetch fails, everything cached and
 * fetched before it stays, and the error is rethrown.
 */
export async function ensureRateHistory(
	db: AnyDatabase,
	input: ExchangeRateEnsureHistoryInput,
) {
	const coverage = await getRateHistoryCoverage(db);
	const spans = getMissingHistorySpans({
		...getRangeDates(input.range, new Date()),
		coverage:
			coverage && input.force ? { ...coverage, lastFetchedAt: 0 } : coverage,
		now: Date.now(),
	});

	for (const span of spans) {
		const rows = await fetchExchangeRateHistory(span);
		const fetchedAt = Date.now();
		await upsertRateHistory(
			db,
			rows.map((row) => ({ ...row, fetchedAt })),
		);
	}

	return spans;
}

/** Cached daily `base` → `quote` rates over `range` (no fetching), with the latest point and change. */
export async function getPairHistory(
	db: AnyDatabase,
	input: ExchangeRatePairHistoryInput,
) {
	const rows = await getRateHistory(db, getRangeDates(input.range, new Date()));
	const series = buildPairSeries(rows, input.base, input.quote);
	const latest = series.at(-1);

	return {
		series,
		latestRate: latest?.rate ?? null,
		latestDate: latest?.date ?? null,
		changePercent: getChangePercent(series),
	};
}

/**
 * Every other currency against `displayCurrency` over `range`, from the cached history:
 * `rate` is 1 currency = rate × displayCurrency (the latest cached rate when there's no
 * history), `sparkline` at most SPARKLINE_POINTS rates. `updatedAt` is when the latest
 * history day (else the latest rates) was fetched.
 */
export async function getRatesOverview(
	db: AnyDatabase,
	input: ExchangeRateOverviewInput,
) {
	const [rows, cachedRates, coverage] = await Promise.all([
		getRateHistory(db, getRangeDates(input.range, new Date())),
		getCachedRates(db, input.displayCurrency),
		getRateHistoryCoverage(db),
	]);

	const currencies = SUPPORTED_CURRENCIES.filter(
		(c) => c !== input.displayCurrency,
	).map((currency) => {
		const series = buildPairSeries(rows, currency, input.displayCurrency);
		const latest = series.at(-1);
		// Cached rates are 1 displayCurrency = rate × currency
		const cached = cachedRates.find((r) => r.target === currency);

		return {
			currency,
			rate: latest?.rate ?? (cached ? 1 / cached.rate : null),
			changePercent: getChangePercent(series),
			sparkline: downsample(
				series.map((p) => p.rate),
				SPARKLINE_POINTS,
			),
			latestDate: latest?.date ?? null,
		};
	});

	const updatedAt =
		coverage?.lastFetchedAt ??
		(cachedRates.length > 0
			? Math.min(...cachedRates.map((r) => r.fetchedAt))
			: null);

	return {
		currencies,
		updatedAt,
		isStale: updatedAt === null || isRateStale(updatedAt),
	};
}
