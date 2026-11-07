import {
	EXCHANGE_RATE_RANGES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const exchangeRateFetchSchema = z.object({
	base: z.enum(SUPPORTED_CURRENCIES, { error: "validation.selectCurrency" }),
});

export const exchangeRateGetSchema = z.object({
	base: z.enum(SUPPORTED_CURRENCIES, { error: "validation.selectCurrency" }),
	target: z.enum(SUPPORTED_CURRENCIES, { error: "validation.selectCurrency" }),
});

export type ExchangeRateFetchInput = z.infer<typeof exchangeRateFetchSchema>;
export type ExchangeRateGetInput = z.infer<typeof exchangeRateGetSchema>;

const currencySchema = z.enum(SUPPORTED_CURRENCIES, {
	error: "validation.selectCurrency",
});
const rangeSchema = z.enum(EXCHANGE_RATE_RANGES);

export const exchangeRateEnsureHistorySchema = z.object({
	range: rangeSchema,
	/** Refetch the latest days even when they aren't stale yet (manual refresh). */
	force: z.boolean().optional(),
});

export const exchangeRatePairHistorySchema = z.object({
	base: currencySchema,
	quote: currencySchema,
	range: rangeSchema,
});

export const exchangeRateOverviewSchema = z.object({
	displayCurrency: currencySchema,
	range: rangeSchema,
});

export type ExchangeRateEnsureHistoryInput = z.infer<
	typeof exchangeRateEnsureHistorySchema
>;
export type ExchangeRatePairHistoryInput = z.infer<
	typeof exchangeRatePairHistorySchema
>;
export type ExchangeRateOverviewInput = z.infer<
	typeof exchangeRateOverviewSchema
>;

/** `/exchange-rates` URL params; invalid values fall back to the page defaults. */
export const exchangeRatesSearchSchema = z.object({
	base: currencySchema.optional().catch(undefined),
	quote: currencySchema.optional().catch(undefined),
	range: rangeSchema.default("1M").catch("1M"),
});

export type ExchangeRatesSearch = z.infer<typeof exchangeRatesSearchSchema>;
