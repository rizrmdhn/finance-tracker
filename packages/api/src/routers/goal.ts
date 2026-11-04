import {
	addGoalContribution,
	archiveGoal,
	createGoal,
	deleteGoal,
	deleteGoalContribution,
	getAccountAllocations,
	getGoalById,
	getGoalContributions,
	getGoals,
	purchaseGoal,
	updateGoal,
} from "@finance-tracker/queries";
import {
	goalContributionSchema,
	goalPurchaseSchema,
	goalSchema,
	goalUpdateSchema,
} from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const goalRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() => getGoals(ctx.db));
		if (err) throw toTRPCError(err);
		return data;
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getGoalById(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	create: publicProcedure.input(goalSchema).mutation(async ({ ctx, input }) => {
		const [data, err] = await tryCatchAsync(() => createGoal(ctx.db, input));
		if (err) throw toTRPCError(err);
		return data;
	}),

	update: publicProcedure
		.input(goalUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() => updateGoal(ctx.db, input));
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteGoal(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	purchase: publicProcedure
		.input(goalPurchaseSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				purchaseGoal(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	archive: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				archiveGoal(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	addContribution: publicProcedure
		.input(goalContributionSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				addGoalContribution(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	getContributions: publicProcedure
		.input(z.object({ goalId: z.string() }))
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getGoalContributions(ctx.db, input.goalId),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	deleteContribution: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteGoalContribution(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	getAccountAllocations: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() =>
			getAccountAllocations(ctx.db),
		);
		if (err) throw toTRPCError(err);
		return data;
	}),
});
