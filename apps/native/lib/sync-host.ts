import {
	createSyncServerSession,
	isSyncMessage,
	type SyncError,
	type SyncResult,
} from "@finance-tracker/sync";
import { SYNC_PORT, syncStore } from "./sync-client";
import {
	type NativeWsServer,
	startNativeWsServer,
	type WsConnection,
} from "./ws-server";

/** Connections are dropped this long after their first sync message, done or not. */
const SYNC_SERVER_TIMEOUT_MS = 60_000;

export interface SyncHostOptions {
	/** Our own device id (see `getDeviceIdentity`) */
	deviceId: string;
	onSyncComplete(result: SyncResult): void;
	onSyncError(err: SyncError): void;
	/** Any parsed message that is not part of a sync session (pairing) */
	onOtherMessage(conn: WsConnection, msg: unknown): void;
	onConnectionClose?(conn: WsConnection): void;
}

/** Serves sync sessions to trusted peers on `SYNC_PORT`, one session per connection. */
export function startSyncHost(opts: SyncHostOptions): NativeWsServer {
	return startNativeWsServer(SYNC_PORT, (conn) => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const session = createSyncServerSession({
			deviceId: opts.deviceId,
			store: syncStore,
			channel: {
				send: (msg) => conn.send(JSON.stringify(msg)),
				close: () => conn.close(),
			},
			// The client closes after `sync-done`; the timer covers clients that don't
			onComplete: opts.onSyncComplete,
			onError: opts.onSyncError,
		});

		conn.onClose(() => {
			clearTimeout(timer);
			opts.onConnectionClose?.(conn);
		});

		conn.onMessage((text) => {
			let msg: unknown;
			try {
				msg = JSON.parse(text);
			} catch {
				return; // ignore malformed messages
			}
			if (isSyncMessage(msg)) {
				// Started on the first sync message, not on connect, so pairing has no deadline
				timer ??= setTimeout(() => conn.close(), SYNC_SERVER_TIMEOUT_MS);
				void session.handle(msg);
				return;
			}
			opts.onOtherMessage(conn, msg);
		});
	});
}
