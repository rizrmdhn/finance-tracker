import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	type AnyDatabase,
	exchangeRateHistory,
	exchangeRates,
} from "@finance-tracker/db";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { withTransaction } from "./utils/with-transaction";

/** Rows per INSERT, well under SQLite's bound-parameter limit (4 columns each). */
const HISTORY_UPSERT_CHUNK = 1000;

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
