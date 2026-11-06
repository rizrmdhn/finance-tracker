import { SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
import {
	ensureRateHistory,
	getCachedRate,
	getCachedRates,
	getPairHistory,
	getRatesOverview,
	upsertRates,
} from "@finance-tracker/queries";
import {
	exchangeRateEnsureHistorySchema,
	exchangeRateFetchSchema,
	exchangeRateGetSchema,
	exchangeRateOverviewSchema,
	exchangeRatePairHistorySchema,
} from "@finance-tracker/schema";
import {
	fetchExchangeRates,
	isRateStale,
	tryCatchAsync,
} from "@finance-tracker/utils";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const exchangeRateRouter = createTRPCRouter({
	fetch: publicProcedure
		.input(exchangeRateFetchSchema)
		.mutation(async ({ ctx, input }) => {
			const targets = SUPPORTED_CURRENCIES.filter((c) => c !== input.base);
			const [rows, fetchErr] = await tryCatchAsync(() =>
				fetchExchangeRates(input.base, targets),
			);
			if (fetchErr) throw toTRPCError(fetchErr);

			const [data, err] = await tryCatchAsync(() => upsertRates(ctx.db, rows));
			if (err) throw toTRPCError(err);
			return data;
		}),

	fetchIfStale: publicProcedure
		.input(exchangeRateFetchSchema)
		.mutation(async ({ ctx, input }) => {
			const [cached, cacheErr] = await tryCatchAsync(() =>
				getCachedRates(ctx.db, input.base),
			);
			if (cacheErr) throw toTRPCError(cacheErr);

			const stale =
				cached.length === 0 || cached.some((r) => isRateStale(r.fetchedAt));

			if (!stale) return null;

			const targets = SUPPORTED_CURRENCIES.filter((c) => c !== input.base);
			const [rows, fetchErr] = await tryCatchAsync(() =>
				fetchExchangeRates(input.base, targets),
			);
			if (fetchErr) throw toTRPCError(fetchErr);

			const [data, err] = await tryCatchAsync(() => upsertRates(ctx.db, rows));
			if (err) throw toTRPCError(err);
			return data;
		}),

	getAll: publicProcedure
		.input(exchangeRateFetchSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getCachedRates(ctx.db, input.base),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	get: publicProcedure
		.input(exchangeRateGetSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getCachedRate(ctx.db, input.base, input.target),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	/** Fetches the history `range` still lacks; on failure the cached history stays usable. */
	ensureHistory: publicProcedure
		.input(exchangeRateEnsureHistorySchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				ensureRateHistory(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	getPairHistory: publicProcedure
		.input(exchangeRatePairHistorySchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getPairHistory(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	getOverview: publicProcedure
		.input(exchangeRateOverviewSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getRatesOverview(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
