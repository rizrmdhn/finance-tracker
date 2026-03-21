export const DEFAULT_CURRENCY = "IDR";
export const DEFAULT_LOCALE = "id-ID";

export const SUPPORTED_CURRENCIES = ["IDR", "USD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
	IDR: "Rp",
	USD: "$",
};

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
	IDR: "IDR — Indonesian Rupiah",
	USD: "USD — US Dollar",
};
