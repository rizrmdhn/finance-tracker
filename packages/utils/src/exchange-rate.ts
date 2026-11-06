import {
	SUPPORTED_CURRENCIES,
	type SupportedCurrency,
} from "@finance-tracker/constants";

const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v2";
const STALE_AFTER_MS = 1000 * 60 * 60 * 4; // 4 hours

/** Rate history is stored against one fixed base; any pair is derived from it. */
export const HISTORY_BASE_CURRENCY = "EUR" satisfies SupportedCurrency;

export type ExchangeRateRow = {
	base: SupportedCurrency;
	target: SupportedCurrency;
	rate: number;
	fetchedAt: number;
};

/** 1 EUR = `rate` `target` on `date` (`YYYY-MM-DD`). */
export type ExchangeRateHistoryRow = {
	target: SupportedCurrency;
	date: string;
	rate: number;
};

type FrankfurterResponse = Array<{
	date: string;
	base: SupportedCurrency;
	quote: SupportedCurrency;
	rate: number;
}>;

export async function fetchExchangeRates(
	base: SupportedCurrency,
	targets: SupportedCurrency[],
): Promise<ExchangeRateRow[]> {
	const quotes = targets.join(",");
	const res = await fetch(
		`${FRANKFURTER_BASE_URL}/rates?base=${base}&quotes=${quotes}`,
	);

	if (!res.ok) {
		throw new Error(`Failed to fetch exchange rates: ${res.status}`);
	}

	const json = (await res.json()) as FrankfurterResponse;
	const fetchedAt = Date.now();

	return json.map(({ quote, rate }) => ({
		base,
		target: quote,
		rate,
		fetchedAt,
	}));
}

/**
 * Daily EUR-based rates for every other supported currency, `from`–`to` inclusive
 * (`YYYY-MM-DD`). Days without a published rate (weekends, holidays) have no rows.
 */
export async function fetchExchangeRateHistory({
	from,
	to,
}: {
	from: string;
	to: string;
}): Promise<ExchangeRateHistoryRow[]> {
	const quotes = SUPPORTED_CURRENCIES.filter(
		(c) => c !== HISTORY_BASE_CURRENCY,
	).join(",");
	const res = await fetch(
		`${FRANKFURTER_BASE_URL}/rates?base=${HISTORY_BASE_CURRENCY}&quotes=${quotes}&from=${from}&to=${to}`,
	);

	if (!res.ok) {
		throw new Error(`Failed to fetch exchange rate history: ${res.status}`);
	}

	const json = (await res.json()) as FrankfurterResponse;

	return json.map(({ quote, date, rate }) => ({ target: quote, date, rate }));
}

export function isRateStale(fetchedAt: number, now = Date.now()): boolean {
	return now - fetchedAt > STALE_AFTER_MS;
}
