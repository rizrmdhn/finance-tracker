import {
	CURRENCY_LOCALE_MAP,
	DEFAULT_LOCALE,
	type SupportedCurrency,
} from "@finance-tracker/constants";

const NO_DECIMAL_CURRENCIES: SupportedCurrency[] = ["IDR", "JPY"];

function localeOf(currency: SupportedCurrency) {
	return CURRENCY_LOCALE_MAP[currency] ?? DEFAULT_LOCALE;
}

function maxDecimalsOf(currency: SupportedCurrency) {
	return NO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;
}

/** The decimal separator an amount input in `currency` accepts, or null when it takes whole numbers only. */
export function getAmountDecimalSeparator(
	currency: SupportedCurrency,
): string | null {
	if (maxDecimalsOf(currency) === 0) return null;
	const sample = new Intl.NumberFormat(localeOf(currency)).format(1.5);
	return sample.replace(/\d/g, "") || ".";
}

/** Formats a stored amount for an amount input, e.g. 1234567 IDR → "1.234.567". */
export function formatAmountInput(
	value: number | undefined,
	currency: SupportedCurrency,
): string {
	if (value === undefined) return "";
	return new Intl.NumberFormat(localeOf(currency), {
		minimumFractionDigits: 0,
		maximumFractionDigits: maxDecimalsOf(currency),
	}).format(value);
}

/**
 * Reads what the user typed into an amount input: the value it stands for and the text to show,
 * grouped as they type ("1234567" IDR → "1.234.567") while keeping a trailing decimal separator.
 */
export function parseAmountInput(
	input: string,
	currency: SupportedCurrency,
): { display: string; value: number | undefined } {
	const decimalSeparator = getAmountDecimalSeparator(currency);
	// Keypads follow the device locale, so a "." or "," just typed at the end means the decimal separator.
	const text =
		decimalSeparator && !input.includes(decimalSeparator) && /[.,]$/.test(input)
			? input.slice(0, -1) + decimalSeparator
			: input;
	const decimalIndex = decimalSeparator ? text.indexOf(decimalSeparator) : -1;
	const hasDecimal = decimalIndex >= 0;

	const intDigits = (hasDecimal ? text.slice(0, decimalIndex) : text)
		.replace(/\D/g, "")
		.replace(/^0+(?=\d)/, "");
	const fracDigits = hasDecimal
		? text
				.slice(decimalIndex + 1)
				.replace(/\D/g, "")
				.slice(0, maxDecimalsOf(currency))
		: "";

	if (intDigits === "" && !hasDecimal) return { display: "", value: undefined };

	const intText = new Intl.NumberFormat(localeOf(currency), {
		maximumFractionDigits: 0,
	}).format(Number(intDigits || "0"));

	return {
		display: hasDecimal
			? `${intText}${decimalSeparator}${fracDigits}`
			: intText,
		value: Number(`${intDigits || "0"}.${fracDigits || "0"}`),
	};
}
