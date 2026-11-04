import type { AnyDatabase } from "@finance-tracker/db";
import { updateSyncPeerHost } from "@finance-tracker/queries";
import {
	createSyncClientSession,
	isSyncMessage,
	SyncError,
	type SyncResult,
} from "@finance-tracker/sync";
import { db, sqlite } from "./db";
import { createOpSqliteSyncStore } from "./sync-store";

export const SYNC_PORT = 47821;
const CONNECT_TIMEOUT_MS = 10_000;

const database = db as unknown as AnyDatabase;

/** Shared by the hosting server and outgoing syncs. */
export const syncStore = createOpSqliteSyncStore(sqlite, database);

export interface SyncWithPeerOptions {
	/** `ip:port` of the peer's sync server */
	host: string;
	/** Our own device id (see `getDeviceIdentity`) */
	deviceId: string;
	/** Fail unless the server proves to be this trusted device */
	expectedPeerDeviceId?: string;
}

/**
 * Runs one sync session against a peer's sync server and remembers its host on success.
 * Rejects with a `SyncError` (map `err.code` with `syncErrorKey`) on any failure.
 */
export async function syncWithPeer({
	host,
	deviceId,
	expectedPeerDeviceId,
}: SyncWithPeerOptions): Promise<SyncResult> {
	const ws = new WebSocket(`ws://${host}`);
	const session = createSyncClientSession({
		deviceId,
		store: syncStore,
		channel: {
			send: (msg) => ws.send(JSON.stringify(msg)),
			close: () => ws.close(),
		},
		expectedPeerDeviceId,
	});

	let connectTimer: ReturnType<typeof setTimeout> | undefined;
	// Closing a socket that is still connecting does not reliably fire `onclose`
	const connectTimeout = new Promise<never>((_, reject) => {
		connectTimer = setTimeout(() => {
			reject(new SyncError("timeout", "connect timeout"));
			session.handleClose();
		}, CONNECT_TIMEOUT_MS);
	});

	ws.onopen = () => {
		clearTimeout(connectTimer);
		session.start();
	};
	ws.onmessage = (event) => {
		let msg: unknown;
		try {
			msg = JSON.parse(event.data as string);
		} catch {
			return; // ignore malformed messages
		}
		if (isSyncMessage(msg)) void session.handle(msg);
	};
	ws.onclose = () => session.handleClose();
	ws.onerror = () => session.handleClose();

	try {
		const result = await Promise.race([session.result, connectTimeout]);
		await updateSyncPeerHost(database, result.peerDeviceId, host);
		return result;
	} finally {
		clearTimeout(connectTimer);
	}
}
