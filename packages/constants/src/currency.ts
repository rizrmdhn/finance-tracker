export const DEFAULT_CURRENCY = "IDR";
export const DEFAULT_LOCALE = "id-ID";

export const SUPPORTED_CURRENCIES = [
	"IDR",
	"USD",
	"SGD",
	"MYR",
	"EUR",
	"GBP",
	"JPY",
	"AUD",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LOCALE_MAP: Record<SupportedCurrency, string> = {
	IDR: "id-ID",
	USD: "en-US",
	SGD: "en-SG",
	MYR: "ms-MY",
	EUR: "de-DE",
	GBP: "en-GB",
	JPY: "ja-JP",
	AUD: "en-AU",
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
	IDR: "Rp",
	USD: "$",
	SGD: "S$",
	MYR: "RM",
	EUR: "€",
	GBP: "£",
	JPY: "¥",
	AUD: "A$",
};

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
	IDR: "IDR — Indonesian Rupiah",
	USD: "USD — US Dollar",
	SGD: "SGD — Singapore Dollar",
	MYR: "MYR — Malaysian Ringgit",
	EUR: "EUR — Euro",
	GBP: "GBP — British Pound",
	JPY: "JPY — Japanese Yen",
	AUD: "AUD — Australian Dollar",
};
