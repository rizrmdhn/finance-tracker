import {
	CURRENCY_LOCALE_MAP,
	DEFAULT_CURRENCY,
	DEFAULT_LOCALE,
	type SupportedCurrency,
} from "@finance-tracker/constants";

const NO_DECIMAL_CURRENCIES: SupportedCurrency[] = ["IDR", "JPY"];

/** Formats an amount in its own currency, with that currency's locale. */
export function formatCurrency(
	amount: number,
	currency: SupportedCurrency,
): string {
	return new Intl.NumberFormat(
		CURRENCY_LOCALE_MAP[currency] ?? DEFAULT_LOCALE,
		{
			style: "currency",
			currency,
			maximumFractionDigits: NO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2,
		},
	).format(amount);
}

export function formatAmount(
	amount: number,
	currency: SupportedCurrency = DEFAULT_CURRENCY,
): string {
	const locale = CURRENCY_LOCALE_MAP[currency] ?? DEFAULT_LOCALE;
	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

/**
 * Converts between `base` and other currencies with rates where 1 base = rate × target.
 * Without a rate for a currency the amount is passed through unchanged.
 */
export function createCurrencyConverter(
	base: SupportedCurrency,
	rates: { target: SupportedCurrency; rate: number }[],
) {
	const rateMap = new Map(rates.map((r) => [r.target, r.rate]));
	const rateOf = (currency: SupportedCurrency) =>
		currency === base ? 1 : rateMap.get(currency);

	return {
		/** `amount` in `currency` → base currency. */
		toBase(amount: number, currency: SupportedCurrency) {
			const rate = rateOf(currency);
			return rate ? amount / rate : amount;
		},
		/** `amount` in base currency → `currency`, rounded to cents; null without a rate. */
		fromBase(amount: number, currency: SupportedCurrency) {
			const rate = rateOf(currency);
			return rate ? Math.round(amount * rate * 100) / 100 : null;
		},
	};
}
