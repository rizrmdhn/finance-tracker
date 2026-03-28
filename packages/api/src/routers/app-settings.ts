import { APP_SETTINGS_KEYS } from "@finance-tracker/constants";
import { getAppSettingByKey, setAppSetting } from "@finance-tracker/queries";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const appSettingsRouter = createTRPCRouter({
	get: publicProcedure
		.input(z.object({ key: z.enum(APP_SETTINGS_KEYS) }))
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getAppSettingByKey(ctx.db, input.key),
			);

			if (err) throw toTRPCError(err);
			return data ?? null;
		}),

	set: publicProcedure
		.input(z.object({ key: z.enum(APP_SETTINGS_KEYS), value: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				setAppSetting(ctx.db, input.key, input.value),
			);

			if (err) throw toTRPCError(err);
			return data;
		}),
});
