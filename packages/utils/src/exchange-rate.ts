import type { SupportedCurrency } from "@finance-tracker/constants";

const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v2";
const STALE_AFTER_MS = 1000 * 60 * 60 * 4; // 4 hours

export type ExchangeRateRow = {
	base: SupportedCurrency;
	target: SupportedCurrency;
	rate: number;
	fetchedAt: number;
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

export function isRateStale(fetchedAt: number): boolean {
	return Date.now() - fetchedAt > STALE_AFTER_MS;
}
