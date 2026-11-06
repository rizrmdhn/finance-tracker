import {
	CURRENCY_LOCALE_MAP,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { formatCurrency } from "./currency";

export type RateChangeDirection = "up" | "down" | "flat";

/**
 * A rate in `currency`, with that currency's locale: 2 decimals from 100 up, up to 4 from 1 up,
 * and 2–4 significant digits below 1 so small rates keep their digits (e.g. `$0.000060`).
 */
export function formatRate(rate: number, currency: SupportedCurrency): string {
	const abs = Math.abs(rate);
	const digits: Intl.NumberFormatOptions =
		abs >= 1
			? { minimumFractionDigits: 2, maximumFractionDigits: abs >= 100 ? 2 : 4 }
			: { minimumSignificantDigits: 2, maximumSignificantDigits: 4 };
	return new Intl.NumberFormat(CURRENCY_LOCALE_MAP[currency], {
		style: "currency",
		currency,
		...digits,
	}).format(rate);
}

/** A converted amount: the usual currency format, with significant digits below 1. */
export function formatConvertedAmount(
	amount: number,
	currency: SupportedCurrency,
): string {
	const abs = Math.abs(amount);
	return abs === 0 || abs >= 1
		? formatCurrency(amount, currency)
		: formatRate(amount, currency);
}

/** Up, down, or flat when there's no change or it rounds to 0.00%. */
export function getRateChangeDirection(
	changePercent: number | null,
): RateChangeDirection {
	if (changePercent === null || Math.abs(changePercent) < 0.005) return "flat";
	return changePercent > 0 ? "up" : "down";
}

/**
 * The pair to show from (possibly missing) URL params: quote defaults to the display currency,
 * base to the first other currency; a base equal to the quote falls back the same way.
 */
export function resolveRatePair(
	pair: { base?: SupportedCurrency; quote?: SupportedCurrency },
	displayCurrency: SupportedCurrency,
): { base: SupportedCurrency; quote: SupportedCurrency } {
	const quote = pair.quote ?? displayCurrency;
	const base =
		pair.base && pair.base !== quote
			? pair.base
			: (SUPPORTED_CURRENCIES.find((c) => c !== quote) ?? quote);
	return { base, quote };
}
