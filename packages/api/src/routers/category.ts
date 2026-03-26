import {
	createCategory,
	deleteCategory,
	getCategories,
	getDeletedCategories,
	getOffsetPaginatedCategories,
	permanentDeleteAllCategories,
	permanentDeleteCategory,
	restoreCategory,
	seedDefaultCategories,
	updateCategory,
} from "@finance-tracker/queries";
import {
	categorySchema,
	categoryUpdateSchema,
	paginatedCategoriesSchema,
} from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
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

	update: publicProcedure
		.input(categoryUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				updateCategory(ctx.db, input),
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

	seedDefaults: publicProcedure.mutation(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() =>
			seedDefaultCategories(ctx.db),
		);
		if (err) throw toTRPCError(err);
		return data;
	}),

	paginated: publicProcedure
		.input(paginatedCategoriesSchema)
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getOffsetPaginatedCategories(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	listDeleted: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() =>
			getDeletedCategories(ctx.db),
		);
		if (err) throw toTRPCError(err);
		return data;
	}),

	restore: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				restoreCategory(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	permanentDelete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				permanentDeleteCategory(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	emptyTrash: publicProcedure.mutation(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() =>
			permanentDeleteAllCategories(ctx.db),
		);
		if (err) throw toTRPCError(err);
		return data;
	}),
});
