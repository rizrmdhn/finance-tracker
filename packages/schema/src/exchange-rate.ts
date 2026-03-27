import { SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
import { z } from "zod";

export const exchangeRateFetchSchema = z.object({
	base: z.enum(SUPPORTED_CURRENCIES, { error: "Please select a currency" }),
});

export const exchangeRateGetSchema = z.object({
	base: z.enum(SUPPORTED_CURRENCIES, { error: "Please select a currency" }),
	target: z.enum(SUPPORTED_CURRENCIES, { error: "Please select a currency" }),
});

export type ExchangeRateFetchInput = z.infer<typeof exchangeRateFetchSchema>;
export type ExchangeRateGetInput = z.infer<typeof exchangeRateGetSchema>;
