import type {
	ExchangeRateRange,
	SupportedCurrency,
} from "@finance-tracker/constants";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import {
	type ExchangeRateHistoryRow,
	HISTORY_BASE_CURRENCY,
	isRateStale,
} from "./exchange-rate";

type DateSpan = { from: string; to: string };

type PairPoint = { date: string; rate: number };

const toDateString = (date: Date) => format(date, "yyyy-MM-dd");

const RANGE_START: Record<ExchangeRateRange, (today: Date) => Date> = {
	"1W": (today) => subDays(today, 7),
	"1M": (today) => subMonths(today, 1),
	"3M": (today) => subMonths(today, 3),
	"6M": (today) => subMonths(today, 6),
	"1Y": (today) => subYears(today, 1),
	"5Y": (today) => subYears(today, 5),
};

/** `YYYY-MM-DD` span of `range`, ending on `today` (local calendar day). */
export function getRangeDates(range: ExchangeRateRange, today: Date): DateSpan {
	return {
		from: toDateString(RANGE_START[range](today)),
		to: toDateString(today),
	};
}

/**
 * The spans to fetch so the cached history covers `from`–`to`. The cache is always one
 * contiguous span (no per-day gaps: weekends and holidays legitimately have no rows), so only
 * the head before `minDate` and the tail from `maxDate` can be missing. The tail is refetched
 * once it is stale — the latest day can still change, and new days are published after it.
 */
export function getMissingHistorySpans({
	from,
	to,
	coverage,
	now,
}: DateSpan & {
	coverage: { minDate: string; maxDate: string; lastFetchedAt: number } | null;
	now: number;
}): DateSpan[] {
	if (!coverage) return [{ from, to }];

	const spans: DateSpan[] = [];
	if (from < coverage.minDate) {
		// Ends right before the cache, even past `to`, so the cache stays contiguous
		spans.push({
			from,
			to: toDateString(subDays(parseISO(coverage.minDate), 1)),
		});
	}
	if (coverage.maxDate <= to && isRateStale(coverage.lastFetchedAt, now)) {
		spans.push({ from: coverage.maxDate, to });
	}
	return spans;
}

/** 1 `from` = result × `to`, from one day's EUR-based rates; null when a leg is missing. */
export function crossRate(
	eurRates: Partial<Record<SupportedCurrency, number>>,
	from: SupportedCurrency,
	to: SupportedCurrency,
): number | null {
	const rateOf = (currency: SupportedCurrency) =>
		currency === HISTORY_BASE_CURRENCY ? 1 : eurRates[currency];
	const fromRate = rateOf(from);
	const toRate = rateOf(to);
	return fromRate && toRate ? toRate / fromRate : null;
}

/** Daily `base` → `quote` rates from EUR-based rows, oldest first; days missing a leg are skipped. */
export function buildPairSeries(
	rows: ExchangeRateHistoryRow[],
	base: SupportedCurrency,
	quote: SupportedCurrency,
): PairPoint[] {
	const byDate = new Map<string, Partial<Record<SupportedCurrency, number>>>();
	for (const row of rows) {
		const day = byDate.get(row.date) ?? {};
		day[row.target] = row.rate;
		byDate.set(row.date, day);
	}

	return [...byDate.keys()].sort().flatMap((date) => {
		const rate = crossRate(byDate.get(date) ?? {}, base, quote);
		return rate === null ? [] : [{ date, rate }];
	});
}

/** Change from the first to the last point, in percent; null with fewer than 2 points. */
export function getChangePercent(series: PairPoint[]): number | null {
	const first = series[0];
	const last = series.at(-1);
	if (series.length < 2 || !first || !last) return null;
	return ((last.rate - first.rate) / first.rate) * 100;
}

/** Average daily `base` → `quote` rate per month, keyed `YYYY-MM`. */
export function getMonthlyAverageRates(
	rows: ExchangeRateHistoryRow[],
	base: SupportedCurrency,
	quote: SupportedCurrency,
): Map<string, number> {
	const totals = new Map<string, { sum: number; count: number }>();
	for (const { date, rate } of buildPairSeries(rows, base, quote)) {
		const month = date.slice(0, 7);
		const total = totals.get(month) ?? { sum: 0, count: 0 };
		totals.set(month, { sum: total.sum + rate, count: total.count + 1 });
	}
	return new Map(
		[...totals].map(([month, { sum, count }]) => [month, sum / count]),
	);
}

/** At most `max` evenly spaced values, always keeping the first and the last. */
export function downsample(values: number[], max: number): number[] {
	if (values.length <= max) return values;
	const step = (values.length - 1) / (max - 1);
	const picked = new Set(
		Array.from({ length: max }, (_, i) => Math.round(i * step)),
	);
	return values.filter((_, i) => picked.has(i));
}
