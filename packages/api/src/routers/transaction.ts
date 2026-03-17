import { transactions } from "@finance/db";
import { between, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { procedure, router } from "../trpc";

export const transactionRouter = router({
	list: procedure
		.input(
			z
				.object({
					from: z.number().optional(),
					to: z.number().optional(),
				})
				.optional(),
		)
		.query(({ ctx, input }) => {
			if (input?.from && input?.to) {
				return ctx.db
					.select()
					.from(transactions)
					.where(between(transactions.date, input.from, input.to))
					.orderBy(desc(transactions.date));
			}
			return ctx.db
				.select()
				.from(transactions)
				.orderBy(desc(transactions.date));
		}),

	create: procedure
		.input(
			z.object({
				type: z.enum(["income", "expense"]),
				amount: z.number().positive(),
				note: z.string().optional(),
				categoryId: z.string().optional(),
				tags: z.array(z.string()).optional(),
				date: z.number(),
			}),
		)
		.mutation(({ ctx, input }) => {
			return ctx.db
				.insert(transactions)
				.values({
					...input,
					tags: input.tags ? JSON.stringify(input.tags) : null,
				})
				.returning();
		}),

	update: procedure
		.input(
			z.object({
				id: z.string(),
				type: z.enum(["income", "expense"]).optional(),
				amount: z.number().positive().optional(),
				note: z.string().optional(),
				categoryId: z.string().optional(),
				tags: z.array(z.string()).optional(),
				date: z.number().optional(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { id, tags, ...rest } = input;
			return ctx.db
				.update(transactions)
				.set({ ...rest, tags: tags ? JSON.stringify(tags) : undefined })
				.where(eq(transactions.id, id))
				.returning();
		}),

	delete: procedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.db.delete(transactions).where(eq(transactions.id, input.id));
		}),

	summary: procedure
		.input(z.object({ from: z.number(), to: z.number() }))
		.query(({ ctx, input }) => {
			return ctx.db
				.select({
					type: transactions.type,
					total: sql<number>`SUM(${transactions.amount})`,
				})
				.from(transactions)
				.where(between(transactions.date, input.from, input.to))
				.groupBy(transactions.type);
		}),
});
