import {
	createBudget,
	deleteBudget,
	getBudgets,
	getBudgetsWithSpent,
	updateBudget,
} from "@finance-tracker/queries";
import { budgetSchema, budgetUpdateSchema } from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const budgetRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() => getBudgets(ctx.db));
		if (err) throw toTRPCError(err);
		return data;
	}),

	listWithSpent: publicProcedure
		.input(
			z.object({
				from: z.number(),
				to: z.number(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getBudgetsWithSpent(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	create: publicProcedure
		.input(budgetSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				createBudget(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	update: publicProcedure
		.input(budgetUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				updateBudget(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteBudget(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
