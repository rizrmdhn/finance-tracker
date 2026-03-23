import {
	createRecurrence,
	deleteRecurrence,
	getRecurrences,
	toggleRecurrenceActive,
	updateRecurrence,
} from "@finance-tracker/queries";
import {
	createRecurrenceSchema,
	updateRecurrenceSchema,
} from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const recurrenceRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() => getRecurrences(ctx.db));
		if (err) throw toTRPCError(err);
		return data;
	}),

	create: publicProcedure
		.input(createRecurrenceSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				createRecurrence(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	update: publicProcedure
		.input(updateRecurrenceSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				updateRecurrence(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	toggle: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				toggleRecurrenceActive(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteRecurrence(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
