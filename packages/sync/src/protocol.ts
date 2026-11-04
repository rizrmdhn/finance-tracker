export type PlatformType = "desktop" | "mobile";

export interface DeviceInfo {
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	version: string;
}

// ---- Pairing messages ----

export interface PairRequestMsg {
	type: "pair-request";
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	publicKey: string; // base64 P-256 public key
}

export interface PairChallengeMsg {
	type: "pair-challenge";
	deviceId: string;
	deviceName: string;
	platform: PlatformType;
	publicKey: string; // base64 P-256 public key
}

export interface PairAcceptMsg {
	type: "pair-accept";
	deviceId: string;
}

export interface PairRejectMsg {
	type: "pair-reject";
	deviceId: string;
	reason?: string;
}

export type PairingMessage =
	| PairRequestMsg
	| PairChallengeMsg
	| PairAcceptMsg
	| PairRejectMsg;

// ---- Sync messages (protocol v2) ----

export const SYNC_PROTOCOL_VERSION = 2;

/**
 * One row of `crsql_changes` as sent over the wire.
 *
 * `pk` and `site_id` are BLOBs in SQLite and are transported as hex strings:
 * read them with `hex(pk)` / `hex(site_id)` and write them back with `unhex(?)`
 * (see `GET_CHANGES_SQL` / `APPLY_CHANGE_SQL`).
 */
export interface CRChange {
	table: string;
	pk: string; // hex
	cid: string;
	val: string | number | null;
	col_version: number;
	db_version: number;
	site_id: string; // hex
	cl: number;
	seq: number;
}

export type SyncErrorCode =
	| "untrusted"
	| "repair-required"
	| "auth-failed"
	| "schema-mismatch"
	| "protocol-mismatch"
	| "apply-failed"
	| "protocol-error"
	| "connection-closed"
	| "timeout"
	| "internal";

/** client → server: opens a sync session */
export interface SyncHelloMsg {
	type: "sync-hello";
	protocolVersion: number;
	deviceId: string;
	nonce: string; // 16 random bytes, hex
	schemaHash: string;
}

/** server → client: proves the server knows the shared secret */
export interface SyncChallengeMsg {
	type: "sync-challenge";
	deviceId: string;
	nonce: string; // 16 random bytes, hex
	proof: string; // HMAC-SHA256(secret, "server|" + clientNonce + "|" + serverNonce), hex
	siteId: string;
	dbVersion: number;
	schemaHash: string;
}

/** client → server: proves the client knows the shared secret */
export interface SyncAuthMsg {
	type: "sync-auth";
	proof: string; // HMAC-SHA256(secret, "client|" + serverNonce + "|" + clientNonce), hex
	siteId: string;
	dbVersion: number;
	since: number; // send me your changes with db_version > since
}

/** Either direction: a batch of changes. The server's batch also says what it wants back. */
export interface SyncChangesMsg {
	type: "sync-changes";
	dbVersion: number;
	changes: CRChange[];
	since?: number; // server → client only: send me your changes with db_version > since
}

/** server → client: the server applied the client's changes */
export interface SyncDoneMsg {
	type: "sync-done";
	received: number;
	sent: number;
}

/** Either direction: the session failed; the sender closes the connection */
export interface SyncErrorMsg {
	type: "sync-error";
	code: SyncErrorCode;
	message?: string;
}

export type SyncSessionMessage =
	| SyncHelloMsg
	| SyncChallengeMsg
	| SyncAuthMsg
	| SyncChangesMsg
	| SyncDoneMsg
	| SyncErrorMsg;

// ---- Union ----
export type SyncMessage = PairingMessage | SyncSessionMessage;

const SYNC_SESSION_TYPES = new Set<string>([
	"sync-hello",
	"sync-challenge",
	"sync-auth",
	"sync-changes",
	"sync-done",
	"sync-error",
]);

/** True for messages that belong to a sync session (as opposed to pairing). */
export function isSyncMessage(msg: unknown): msg is SyncSessionMessage {
	return (
		typeof msg === "object" &&
		msg !== null &&
		SYNC_SESSION_TYPES.has((msg as { type?: unknown }).type as string)
	);
}
