import {
	addTrustedPeer,
	getTrustedPeerByDeviceId,
	getTrustedPeers,
	removeTrustedPeer,
} from "@finance-tracker/queries";
import { tryCatchAsync } from "@finance-tracker/utils";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { toTRPCError } from "../utils/to-trpc-error";

export const peerRouter = createTRPCRouter({
	list: publicProcedure.query(async ({ ctx }) => {
		const [data, err] = await tryCatchAsync(() => getTrustedPeers(ctx.db));
		if (err) throw toTRPCError(err);
		return data;
	}),

	getByDeviceId: publicProcedure
		.input(z.object({ deviceId: z.string() }))
		.query(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				getTrustedPeerByDeviceId(ctx.db, input.deviceId),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	add: publicProcedure
		.input(
			z.object({
				deviceId: z.string(),
				deviceName: z.string(),
				platform: z.enum(["desktop", "mobile"]),
				publicKey: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				addTrustedPeer(ctx.db, input),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),

	remove: publicProcedure
		.input(z.object({ deviceId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [data, err] = await tryCatchAsync(() =>
				removeTrustedPeer(ctx.db, input.deviceId),
			);
			if (err) throw toTRPCError(err);
			return data;
		}),
});
