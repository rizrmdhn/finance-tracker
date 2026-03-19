import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@finance-tracker/constants";

export function formatCurrency(
	amount: number,
	currency = DEFAULT_CURRENCY,
	locale = DEFAULT_LOCALE,
): string {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(amount);
}

export function formatAmount(amount: number, locale = DEFAULT_LOCALE): string {
	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}
