export const DEFAULT_CURRENCY = "IDR";
export const DEFAULT_LOCALE = "id-ID";

export const SUPPORTED_CURRENCIES = ["USD", "IDR"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
	USD: "$",
	IDR: "Rp",
};
