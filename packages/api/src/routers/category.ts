import {
	createCategory,
	deleteCategory,
	getCategories,
} from "@finance-tracker/queries";
import { categorySchema } from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "..";
import { toTRPCError } from "../utils/to-trpc-error";

export const categoryRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() => getCategories(ctx.db));
		if (err) throw toTRPCError(err);
		return data;
	}),

	create: publicProcedure
		.input(categorySchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				createCategory(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteCategory(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
