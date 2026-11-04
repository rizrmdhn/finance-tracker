import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils";
import {
	type CRChange,
	SYNC_PROTOCOL_VERSION,
	type SyncChangesMsg,
	type SyncErrorCode,
	type SyncSessionMessage,
} from "./protocol";

// ---- SQL for cr-sqlite backed stores ----

/** Params: `[since, excludeSiteId, excludeSiteId]` (excludeSiteId: hex or null). */
export const GET_CHANGES_SQL = `SELECT "table", hex(pk) AS pk, cid, val, col_version, db_version, hex(coalesce(site_id, crsql_site_id())) AS site_id, cl, seq FROM crsql_changes WHERE db_version > ? AND (? IS NULL OR site_id IS NOT unhex(?))`;
/** Params: `changeToParams(change)`. Run all rows of a batch in one transaction. */
export const APPLY_CHANGE_SQL = `INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq) VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;
export const SITE_ID_SQL = "SELECT hex(crsql_site_id()) AS site_id";
export const DB_VERSION_SQL = "SELECT crsql_db_version() AS db_version";
/** Params: `[tableName]`. Feed the names into `computeSchemaHash`. */
export const TABLE_COLUMNS_SQL = "SELECT name FROM pragma_table_info(?)";

export function changeToParams(c: CRChange) {
	return [
		c.table,
		c.pk,
		c.cid,
		c.val,
		c.col_version,
		c.db_version,
		c.site_id,
		c.cl,
		c.seq,
	] as const;
}

/** sha256 hex over the sorted table/column names, so two devices can tell their schemas apart. */
export function computeSchemaHash(tables: Record<string, string[]>): string {
	const canonical = Object.keys(tables)
		.sort()
		.map((t) => `${t}:${[...(tables[t] ?? [])].sort().join(",")}`)
		.join(";");
	return bytesToHex(sha256(new TextEncoder().encode(canonical)));
}

// ---- Engine interface ----

export interface PeerSyncState {
	sharedSecret: string | null; // hex; null = paired before v2, must re-pair
	siteId: string | null; // peer's cr-sqlite site id last time we synced
	lastSyncedVersion: number; // highest peer db_version we have received
}

export interface SyncStore {
	getSiteId(): Promise<string>; // hex
	getDbVersion(): Promise<number>;
	getSchemaHash(): Promise<string>;
	/** Changes with db_version > since, excluding rows whose site_id is excludeSiteId. */
	getChanges(since: number, excludeSiteId: string | null): Promise<CRChange[]>;
	/** MUST be atomic (one transaction) and throw on failure. */
	applyChanges(changes: CRChange[]): Promise<void>;
	/** null = not a trusted peer */
	getPeer(deviceId: string): Promise<PeerSyncState | null>;
	savePeerState(
		deviceId: string,
		state: { siteId: string; lastSyncedVersion: number },
	): Promise<void>;
}

export interface SyncChannel {
	send(msg: SyncSessionMessage): void;
	close(): void;
}

export interface SyncResult {
	peerDeviceId: string;
	received: number;
	sent: number;
}

export class SyncError extends Error {
	readonly code: SyncErrorCode;

	constructor(code: SyncErrorCode, message?: string) {
		super(message ?? code);
		this.name = "SyncError";
		this.code = code;
	}
}

/** A failure reported by the other side via `sync-error`; never echoed back. */
class PeerSyncError extends SyncError {}

export type { CRChange, SyncErrorCode } from "./protocol";

// ---- Shared helpers ----

const encoder = new TextEncoder();

function prove(
	secret: string,
	role: "server" | "client",
	firstNonce: string,
	secondNonce: string,
): string {
	const msg = encoder.encode(`${role}|${firstNonce}|${secondNonce}`);
	return bytesToHex(hmac(sha256, hexToBytes(secret), msg));
}

function safeEqual(a: unknown, b: string): boolean {
	if (typeof a !== "string" || a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * Decide the delta window with a peer from what we stored last time.
 * - Same site, version not behind our watermark: ask for changes after the watermark.
 * - First sync or a new site id (reinstalled): ask for everything.
 * - Same site but version went backwards (restored from backup): ask for everything
 *   and stop excluding the peer's own site, so it gets back the changes it lost.
 * Merging is idempotent, so over-sending is always safe.
 */
function planDelta(
	stored: PeerSyncState,
	peerSiteId: string,
	peerDbVersion: number,
): { since: number; exclude: string | null } {
	const sameSite = stored.siteId === peerSiteId;
	const rolledBack = sameSite && stored.lastSyncedVersion > peerDbVersion;
	return {
		since: sameSite && !rolledBack ? stored.lastSyncedVersion : 0,
		exclude: rolledBack ? null : peerSiteId,
	};
}

/** Watermark after receiving a batch: covers changes committed after `dbVersion` was read. */
function watermark(msg: SyncChangesMsg): number {
	return msg.changes.reduce(
		(max, c) => Math.max(max, c.db_version),
		msg.dbVersion,
	);
}

function expect<T extends SyncSessionMessage["type"]>(
	msg: SyncSessionMessage,
	type: T,
): Extract<SyncSessionMessage, { type: T }> {
	if (msg.type === "sync-error") {
		throw new PeerSyncError(msg.code, msg.message);
	}
	if (msg.type !== type) {
		throw new SyncError("protocol-error", `expected ${type}, got ${msg.type}`);
	}
	return msg as Extract<SyncSessionMessage, { type: T }>;
}

function isChangesMsg(msg: SyncChangesMsg): boolean {
	return typeof msg.dbVersion === "number" && Array.isArray(msg.changes);
}

async function trustedSecret(
	store: SyncStore,
	deviceId: string,
): Promise<{ peer: PeerSyncState; secret: string }> {
	const peer = await store.getPeer(deviceId);
	if (!peer) throw new SyncError("untrusted");
	if (!peer.sharedSecret) throw new SyncError("repair-required");
	return { peer, secret: peer.sharedSecret };
}

async function apply(store: SyncStore, changes: CRChange[]): Promise<void> {
	try {
		await store.applyChanges(changes);
	} catch (err) {
		throw new SyncError(
			"apply-failed",
			err instanceof Error ? err.message : String(err),
		);
	}
}

/**
 * Runs messages one at a time and turns failures into a single terminal error.
 * `fail` notifies the peer (unless the error came from the peer or the socket) and closes.
 */
function createRunner(channel: SyncChannel, onFail: (err: SyncError) => void) {
	let queue = Promise.resolve();
	let finished = false;

	const fail = (err: unknown, notifyPeer = true) => {
		if (finished) return;
		finished = true;
		const syncErr =
			err instanceof SyncError
				? err
				: new SyncError(
						"internal",
						err instanceof Error ? err.message : String(err),
					);
		if (notifyPeer) {
			try {
				channel.send({
					type: "sync-error",
					code: syncErr.code,
					message: syncErr.message,
				});
			} catch {
				// channel already gone; closing below is all we can do
			}
		}
		channel.close();
		onFail(syncErr);
	};

	return {
		get finished() {
			return finished;
		},
		finish() {
			finished = true;
		},
		fail,
		/** Fails after already-received messages are handled, so their errors win. */
		closed(err: SyncError) {
			queue = queue.then(() => fail(err, false));
		},
		run(step: () => Promise<void>): Promise<void> {
			queue = queue.then(async () => {
				if (finished) return;
				try {
					await step();
				} catch (err) {
					fail(err, !(err instanceof PeerSyncError));
				}
			});
			return queue;
		},
	};
}

// ---- Server ----

export interface SyncServerSessionOptions {
	deviceId: string;
	store: SyncStore;
	channel: SyncChannel;
	onComplete?: (result: SyncResult) => void;
	onError?: (err: SyncError) => void;
}

/** One session per incoming connection. Feed every sync message to `handle`. */
export function createSyncServerSession(opts: SyncServerSessionOptions) {
	const { deviceId, store, channel } = opts;
	const runner = createRunner(channel, (err) => opts.onError?.(err));

	let step: "hello" | "auth" | "changes" = "hello";
	let clientDeviceId = "";
	let clientNonce = "";
	let serverNonce = "";
	let secret = "";
	let peer: PeerSyncState | null = null;
	let clientSiteId = "";
	let sent = 0;

	async function onHello(msg: SyncSessionMessage) {
		const hello = expect(msg, "sync-hello");
		if (typeof hello.deviceId !== "string" || typeof hello.nonce !== "string") {
			throw new SyncError("protocol-error", "malformed sync-hello");
		}
		if (hello.protocolVersion !== SYNC_PROTOCOL_VERSION) {
			throw new SyncError("protocol-mismatch");
		}
		({ peer, secret } = await trustedSecret(store, hello.deviceId));
		const schemaHash = await store.getSchemaHash();
		if (hello.schemaHash !== schemaHash) throw new SyncError("schema-mismatch");

		clientDeviceId = hello.deviceId;
		clientNonce = hello.nonce;
		serverNonce = bytesToHex(randomBytes(16));
		const [siteId, dbVersion] = await Promise.all([
			store.getSiteId(),
			store.getDbVersion(),
		]);
		channel.send({
			type: "sync-challenge",
			deviceId,
			nonce: serverNonce,
			proof: prove(secret, "server", clientNonce, serverNonce),
			siteId,
			dbVersion,
			schemaHash,
		});
		step = "auth";
	}

	async function onAuth(msg: SyncSessionMessage) {
		const auth = expect(msg, "sync-auth");
		if (
			!safeEqual(auth.proof, prove(secret, "client", serverNonce, clientNonce))
		) {
			throw new SyncError("auth-failed");
		}
		if (
			typeof auth.siteId !== "string" ||
			typeof auth.dbVersion !== "number" ||
			typeof auth.since !== "number"
		) {
			throw new SyncError("protocol-error", "malformed sync-auth");
		}
		clientSiteId = auth.siteId;
		// biome-ignore lint/style/noNonNullAssertion: set in onHello
		const plan = planDelta(peer!, auth.siteId, auth.dbVersion);
		const dbVersion = await store.getDbVersion();
		const changes = await store.getChanges(auth.since, plan.exclude);
		sent = changes.length;
		channel.send({
			type: "sync-changes",
			dbVersion,
			changes,
			since: plan.since,
		});
		step = "changes";
	}

	async function onChanges(msg: SyncSessionMessage) {
		const batch = expect(msg, "sync-changes");
		if (!isChangesMsg(batch)) {
			throw new SyncError("protocol-error", "malformed sync-changes");
		}
		await apply(store, batch.changes);
		await store.savePeerState(clientDeviceId, {
			siteId: clientSiteId,
			lastSyncedVersion: watermark(batch),
		});
		const received = batch.changes.length;
		channel.send({ type: "sync-done", received, sent });
		runner.finish();
		opts.onComplete?.({ peerDeviceId: clientDeviceId, received, sent });
	}

	const steps = { hello: onHello, auth: onAuth, changes: onChanges };

	return {
		handle(msg: SyncSessionMessage): Promise<void> {
			return runner.run(() => steps[step](msg));
		},
	};
}

// ---- Client ----

export interface SyncClientSessionOptions {
	deviceId: string;
	store: SyncStore;
	channel: SyncChannel;
	/** Reject the session unless the server proves to be this device. */
	expectedPeerDeviceId?: string;
	timeoutMs?: number;
}

/** Call `start()` once the connection is open, feed every sync message to `handle`, and `handleClose()` on close. */
export function createSyncClientSession(opts: SyncClientSessionOptions) {
	const { deviceId, store, channel } = opts;

	let resolveResult!: (result: SyncResult) => void;
	let rejectResult!: (err: SyncError) => void;
	const result = new Promise<SyncResult>((resolve, reject) => {
		resolveResult = resolve;
		rejectResult = reject;
	});
	// Hosts that never await `result` must not crash on an unhandled rejection.
	result.catch(() => {});

	let timer: ReturnType<typeof setTimeout> | undefined;
	const runner = createRunner(channel, (err) => {
		clearTimeout(timer);
		rejectResult(err);
	});

	let step: "challenge" | "changes" | "done" = "challenge";
	let clientNonce = "";
	let serverDeviceId = "";
	let received = 0;
	let sent = 0;
	let exclude: string | null = null;
	let serverSiteId = "";

	async function onChallenge(msg: SyncSessionMessage) {
		const challenge = expect(msg, "sync-challenge");
		if (
			opts.expectedPeerDeviceId !== undefined &&
			challenge.deviceId !== opts.expectedPeerDeviceId
		) {
			throw new SyncError("auth-failed", "unexpected peer device");
		}
		const { peer, secret } = await trustedSecret(store, challenge.deviceId);
		if (
			!safeEqual(
				challenge.proof,
				prove(secret, "server", clientNonce, challenge.nonce),
			)
		) {
			throw new SyncError("auth-failed");
		}
		if (challenge.schemaHash !== (await store.getSchemaHash())) {
			throw new SyncError("schema-mismatch");
		}

		serverDeviceId = challenge.deviceId;
		serverSiteId = challenge.siteId;
		const plan = planDelta(peer, challenge.siteId, challenge.dbVersion);
		exclude = plan.exclude;
		const [siteId, dbVersion] = await Promise.all([
			store.getSiteId(),
			store.getDbVersion(),
		]);
		channel.send({
			type: "sync-auth",
			proof: prove(secret, "client", challenge.nonce, clientNonce),
			siteId,
			dbVersion,
			since: plan.since,
		});
		step = "changes";
	}

	async function onChanges(msg: SyncSessionMessage) {
		const batch = expect(msg, "sync-changes");
		if (!isChangesMsg(batch) || typeof batch.since !== "number") {
			throw new SyncError("protocol-error", "malformed sync-changes");
		}
		await apply(store, batch.changes);
		received = batch.changes.length;
		await store.savePeerState(serverDeviceId, {
			siteId: serverSiteId,
			lastSyncedVersion: watermark(batch),
		});
		if (runner.finished) return;

		const dbVersion = await store.getDbVersion();
		const changes = await store.getChanges(batch.since, exclude);
		if (runner.finished) return;
		sent = changes.length;
		channel.send({ type: "sync-changes", dbVersion, changes });
		step = "done";
	}

	async function onDone(msg: SyncSessionMessage) {
		expect(msg, "sync-done");
		runner.finish();
		clearTimeout(timer);
		resolveResult({ peerDeviceId: serverDeviceId, received, sent });
		channel.close();
	}

	const steps = { challenge: onChallenge, changes: onChanges, done: onDone };

	return {
		result,
		start(): void {
			timer = setTimeout(
				() => runner.fail(new SyncError("timeout")),
				opts.timeoutMs ?? 30_000,
			);
			void runner.run(async () => {
				clientNonce = bytesToHex(randomBytes(16));
				channel.send({
					type: "sync-hello",
					protocolVersion: SYNC_PROTOCOL_VERSION,
					deviceId,
					nonce: clientNonce,
					schemaHash: await store.getSchemaHash(),
				});
			});
		},
		handle(msg: SyncSessionMessage): Promise<void> {
			return runner.run(() => steps[step](msg));
		},
		handleClose(): void {
			runner.closed(new SyncError("connection-closed"));
		},
	};
}
