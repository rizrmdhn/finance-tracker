import { categories } from "@finance-tracker/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { procedure, router } from "../trpc";

export const categoryRouter = router({
	list: procedure.query(({ ctx }) => {
		return ctx.db.select().from(categories);
	}),

	create: procedure
		.input(
			z.object({
				name: z.string().min(1),
				icon: z.string().optional(),
				color: z.string().optional(),
				type: z.enum(["income", "expense", "transfer", "savings"]),
			}),
		)
		.mutation(({ ctx, input }) => {
			return ctx.db.insert(categories).values(input).returning();
		}),

	delete: procedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => {
			return ctx.db.delete(categories).where(eq(categories.id, input.id));
		}),
});
