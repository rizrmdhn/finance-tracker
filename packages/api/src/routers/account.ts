import {
	createAccount,
	deleteAccount,
	getAccounts,
	getAccountsWithBalance,
	updateAccount,
} from "@finance-tracker/queries";
import { accountSchema, accountUpdateSchema } from "@finance-tracker/schema";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const accountRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() => getAccounts(ctx.db));
		if (err) throw toTRPCError(err);
		return data;
	}),

	listWithBalance: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() =>
			getAccountsWithBalance(ctx.db),
		);
		if (err) throw toTRPCError(err);
		return data;
	}),

	create: publicProcedure
		.input(accountSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				createAccount(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	update: publicProcedure
		.input(accountUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				updateAccount(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				deleteAccount(ctx.db, input.id),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
