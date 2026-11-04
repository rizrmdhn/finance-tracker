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
		sharedSecret: string;
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
				sharedSecret: peer.sharedSecret,
				pairedAt: Date.now(),
			},
		})
		.returning();

	// Ensure syncPeers row exists; on re-pair reset delta state so the next sync is a full sync
	await db
		.insert(syncPeers)
		.values({ deviceId: peer.deviceId })
		.onConflictDoUpdate({
			target: syncPeers.deviceId,
			set: { siteId: null, lastSyncedVersion: 0 },
		})
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

/** Auth + delta-sync state for a peer; null if the device is not trusted */
export async function getPeerSyncState(db: AnyDatabase, deviceId: string) {
	const [row] = await db
		.select({
			sharedSecret: trustedPeers.sharedSecret,
			siteId: syncPeers.siteId,
			lastSyncedVersion: syncPeers.lastSyncedVersion,
		})
		.from(trustedPeers)
		.leftJoin(syncPeers, eq(trustedPeers.deviceId, syncPeers.deviceId))
		.where(eq(trustedPeers.deviceId, deviceId))
		.limit(1);

	if (!row) return null;

	return {
		sharedSecret: row.sharedSecret,
		siteId: row.siteId ?? null,
		lastSyncedVersion: row.lastSyncedVersion ?? 0,
	};
}

export async function savePeerSyncState(
	db: AnyDatabase,
	deviceId: string,
	state: { siteId: string; lastSyncedVersion: number },
) {
	await db
		.update(syncPeers)
		.set({
			siteId: state.siteId,
			lastSyncedVersion: state.lastSyncedVersion,
			lastSeenAt: Date.now(),
		})
		.where(eq(syncPeers.deviceId, deviceId))
		.run();
}
