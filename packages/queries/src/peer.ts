import type { AnyDatabase } from "@finance-tracker/db";
import { syncPeers, trustedPeers } from "@finance-tracker/db";
import { eq } from "drizzle-orm";

export async function getTrustedPeers(db: AnyDatabase) {
	return await db.query.trustedPeers.findMany({
		orderBy: (t, { desc }) => [desc(t.pairedAt)],
		with: { syncPeer: true },
	});
}

export async function getTrustedPeerByDeviceId(
	db: AnyDatabase,
	deviceId: string,
) {
	return await db.query.trustedPeers.findFirst({
		where: (t, { eq }) => eq(t.deviceId, deviceId),
	});
}

export async function addTrustedPeer(
	db: AnyDatabase,
	peer: {
		deviceId: string;
		deviceName: string;
		platform: "desktop" | "mobile";
		publicKey: string;
	},
) {
	const [result] = await db
		.insert(trustedPeers)
		.values({ ...peer, pairedAt: Date.now() })
		.onConflictDoUpdate({
			target: trustedPeers.deviceId,
			set: {
				deviceName: peer.deviceName,
				publicKey: peer.publicKey,
				pairedAt: Date.now(),
			},
		})
		.returning();

	// Ensure syncPeers row exists
	await db
		.insert(syncPeers)
		.values({ deviceId: peer.deviceId })
		.onConflictDoNothing()
		.run();

	return result;
}

export async function removeTrustedPeer(db: AnyDatabase, deviceId: string) {
	return await db
		.delete(trustedPeers)
		.where(eq(trustedPeers.deviceId, deviceId))
		.returning();
}

export async function updateSyncPeerLastSeen(
	db: AnyDatabase,
	deviceId: string,
) {
	await db
		.update(syncPeers)
		.set({ lastSeenAt: Date.now() })
		.where(eq(syncPeers.deviceId, deviceId))
		.run();
}

export async function updateSyncPeerHost(
	db: AnyDatabase,
	deviceId: string,
	host: string,
) {
	await db
		.update(syncPeers)
		.set({ lastKnownHost: host, lastSeenAt: Date.now() })
		.where(eq(syncPeers.deviceId, deviceId))
		.run();
}
