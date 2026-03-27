import {
	CURRENCY_LOCALE_MAP,
	DEFAULT_CURRENCY,
	DEFAULT_LOCALE,
	type SupportedCurrency,
} from "@finance-tracker/constants";

export function formatCurrency(
	amount: number,
	currency: SupportedCurrency = DEFAULT_CURRENCY,
): string {
	const locale = CURRENCY_LOCALE_MAP[currency] ?? DEFAULT_LOCALE;
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(amount);
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
