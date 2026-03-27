import type { SupportedCurrency } from "@finance-tracker/constants";
import { type AnyDatabase, exchangeRates } from "@finance-tracker/db";
import { and, eq, sql } from "drizzle-orm";

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
