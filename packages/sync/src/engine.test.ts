import { describe, expect, test } from "bun:test";
import {
	type CRChange,
	createSyncClientSession,
	createSyncServerSession,
	type PeerSyncState,
	type SyncChannel,
	SyncError,
	type SyncResult,
	type SyncStore,
} from "./engine";
import type { SyncSessionMessage } from "./protocol";

// ---- In-memory fakes ----

interface Cell {
	val: string | number | null;
	col_version: number;
	db_version: number;
	site_id: string;
}

/** Mimics cr-sqlite closely enough: LWW per column, merged rows get a fresh local db_version. */
class FakeStore implements SyncStore {
	cells = new Map<string, Cell>();
	version = 0;
	peers = new Map<string, PeerSyncState>();
	schemaHash = "schema-v1";
	failApply = false;

	constructor(readonly siteId: string) {}

	write(table: string, pk: string, cid: string, val: string | number | null) {
		const key = `${table}|${pk}|${cid}`;
		const prev = this.cells.get(key);
		this.version++;
		this.cells.set(key, {
			val,
			col_version: (prev?.col_version ?? 0) + 1,
			db_version: this.version,
			site_id: this.siteId,
		});
	}

	value(table: string, pk: string, cid: string) {
		return this.cells.get(`${table}|${pk}|${cid}`)?.val;
	}

	trust(deviceId: string, secret: string | null) {
		this.peers.set(deviceId, {
			sharedSecret: secret,
			siteId: null,
			lastSyncedVersion: 0,
		});
	}

	/** Snapshot to simulate restoring from a backup later. */
	clone(): FakeStore {
		const copy = new FakeStore(this.siteId);
		copy.cells = new Map([...this.cells].map(([k, v]) => [k, { ...v }]));
		copy.version = this.version;
		copy.peers = new Map([...this.peers].map(([k, v]) => [k, { ...v }]));
		copy.schemaHash = this.schemaHash;
		return copy;
	}

	async getSiteId() {
		return this.siteId;
	}
	async getDbVersion() {
		return this.version;
	}
	async getSchemaHash() {
		return this.schemaHash;
	}
	async getChanges(since: number, excludeSiteId: string | null) {
		const out: CRChange[] = [];
		for (const [key, c] of this.cells) {
			if (c.db_version <= since || c.site_id === excludeSiteId) continue;
			const [table = "", pk = "", cid = ""] = key.split("|");
			out.push({ table, pk, cid, cl: 1, seq: 0, ...c });
		}
		return out;
	}
	async applyChanges(changes: CRChange[]) {
		if (this.failApply) throw new Error("disk full");
		const version = this.version + 1;
		let changed = false;
		for (const c of changes) {
			const key = `${c.table}|${c.pk}|${c.cid}`;
			const prev = this.cells.get(key);
			if (
				prev &&
				(prev.col_version > c.col_version ||
					(prev.col_version === c.col_version && prev.site_id >= c.site_id))
			) {
				continue;
			}
			this.cells.set(key, {
				val: c.val,
				col_version: c.col_version,
				db_version: version,
				site_id: c.site_id,
			});
			changed = true;
		}
		if (changed) this.version = version;
	}
	async getPeer(deviceId: string) {
		const p = this.peers.get(deviceId);
		return p ? { ...p } : null;
	}
	async savePeerState(
		deviceId: string,
		state: { siteId: string; lastSyncedVersion: number },
	) {
		const p = this.peers.get(deviceId);
		if (p) this.peers.set(deviceId, { ...p, ...state });
	}
}

interface Device {
	id: string;
	store: FakeStore;
}

function device(id: string): Device {
	return { id, store: new FakeStore(`SITE-${id}`) };
}

function pair(a: Device, b: Device, secret = "ab".repeat(32)) {
	a.store.trust(b.id, secret);
	b.store.trust(a.id, secret);
}

/** Wires a client and a server session over an in-memory JSON "socket". */
async function sync(
	client: Device,
	server: Device,
	opts: {
		dropServerMessage?: (msg: SyncSessionMessage) => boolean;
		timeoutMs?: number;
	} = {},
) {
	let closed = false;
	const close = () => {
		if (closed) return;
		closed = true;
		queueMicrotask(() => clientSession.handleClose());
	};
	const wire = (msg: SyncSessionMessage) =>
		JSON.parse(JSON.stringify(msg)) as SyncSessionMessage;

	const clientChannel: SyncChannel = {
		send: (msg) => {
			if (closed) return;
			const copy = wire(msg);
			queueMicrotask(() => void serverSession.handle(copy));
		},
		close,
	};
	const serverChannel: SyncChannel = {
		send: (msg) => {
			if (closed) return;
			if (opts.dropServerMessage?.(msg)) return close();
			const copy = wire(msg);
			queueMicrotask(() => void clientSession.handle(copy));
		},
		close,
	};

	let serverResult: SyncResult | undefined;
	let serverError: SyncError | undefined;
	const serverSession = createSyncServerSession({
		deviceId: server.id,
		store: server.store,
		channel: serverChannel,
		onComplete: (r) => {
			serverResult = r;
		},
		onError: (e) => {
			serverError = e;
		},
	});
	const clientSession = createSyncClientSession({
		deviceId: client.id,
		store: client.store,
		channel: clientChannel,
		timeoutMs: opts.timeoutMs,
	});
	clientSession.start();

	const outcome = await clientSession.result.then(
		(result) => ({ result, error: undefined }),
		(error: SyncError) => ({ result: undefined, error }),
	);
	await new Promise((r) => setTimeout(r, 0));
	return { ...outcome, serverResult, serverError };
}

// ---- Tests ----

describe("sync engine", () => {
	test("two-way sync", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		a.store.write("accounts", "a1", "name", "Cash");
		b.store.write("accounts", "b1", "name", "Bank");

		const { result, serverResult } = await sync(a, b);

		expect(result).toEqual({ peerDeviceId: "B", received: 1, sent: 1 });
		expect(serverResult).toEqual({ peerDeviceId: "A", received: 1, sent: 1 });
		expect(a.store.value("accounts", "b1", "name")).toBe("Bank");
		expect(b.store.value("accounts", "a1", "name")).toBe("Cash");
	});

	test("second sync only sends new changes", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		a.store.write("accounts", "a1", "name", "Cash");
		b.store.write("accounts", "b1", "name", "Bank");
		await sync(a, b);

		const idle = await sync(a, b);
		expect(idle.result).toMatchObject({ received: 0, sent: 0 });

		a.store.write("accounts", "a1", "name", "Cash 2");
		b.store.write("accounts", "b2", "name", "Savings");
		const { result } = await sync(a, b);
		expect(result).toMatchObject({ received: 1, sent: 1 });
		expect(b.store.value("accounts", "a1", "name")).toBe("Cash 2");
		expect(a.store.value("accounts", "b2", "name")).toBe("Savings");
	});

	test("relays changes A → B → C", async () => {
		const a = device("A");
		const b = device("B");
		const c = device("C");
		pair(a, b);
		pair(b, c);
		a.store.write("accounts", "a1", "name", "From A");

		await sync(a, b);
		await sync(c, b);
		expect(c.store.value("accounts", "a1", "name")).toBe("From A");

		c.store.write("accounts", "c1", "name", "From C");
		await sync(c, b);
		await sync(a, b);
		expect(a.store.value("accounts", "c1", "name")).toBe("From C");
	});

	test("server restored from backup gets its lost changes back", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		b.store.write("accounts", "b1", "name", "Old");
		await sync(a, b);
		const backup = b.store.clone();
		b.store.write("accounts", "b2", "name", "Lost");
		await sync(a, b);

		b.store = backup; // dbVersion now below A's watermark for B
		expect(b.store.value("accounts", "b2", "name")).toBeUndefined();
		const { result } = await sync(a, b);

		expect(result).toBeDefined();
		expect(b.store.value("accounts", "b2", "name")).toBe("Lost");
	});

	test("client restored from backup gets its lost changes back", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		a.store.write("accounts", "a1", "name", "Old");
		await sync(a, b);
		const backup = a.store.clone();
		a.store.write("accounts", "a2", "name", "Lost");
		await sync(a, b);

		a.store = backup;
		await sync(a, b);
		expect(a.store.value("accounts", "a2", "name")).toBe("Lost");
	});

	test("untrusted client is rejected", async () => {
		const a = device("A");
		const b = device("B");
		a.store.trust(b.id, "ab".repeat(32)); // B does not trust A

		const { error, serverError } = await sync(a, b);
		expect(error?.code).toBe("untrusted");
		expect(serverError?.code).toBe("untrusted");
	});

	test("peer without shared secret requires re-pairing", async () => {
		const a = device("A");
		const b = device("B");
		a.store.trust(b.id, "ab".repeat(32));
		b.store.trust(a.id, null);

		const { error } = await sync(a, b);
		expect(error?.code).toBe("repair-required");
	});

	test("wrong secret fails authentication without exchanging data", async () => {
		const a = device("A");
		const b = device("B");
		a.store.trust(b.id, "ab".repeat(32));
		b.store.trust(a.id, "cd".repeat(32));
		b.store.write("accounts", "b1", "name", "Secret");

		const { error, serverError } = await sync(a, b);
		expect(error?.code).toBe("auth-failed");
		expect(serverError?.code).toBe("auth-failed");
		expect(a.store.value("accounts", "b1", "name")).toBeUndefined();
	});

	test("schema mismatch is rejected", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		b.store.schemaHash = "schema-v2";

		const { error } = await sync(a, b);
		expect(error?.code).toBe("schema-mismatch");
	});

	test("server apply failure reaches the client as an error", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		a.store.write("accounts", "a1", "name", "Cash");
		b.store.failApply = true;

		const { error, serverError } = await sync(a, b);
		expect(error).toBeInstanceOf(SyncError);
		expect(error?.code).toBe("apply-failed");
		expect(serverError?.code).toBe("apply-failed");
		expect((await b.store.getPeer("A"))?.lastSyncedVersion).toBe(0);
	});

	test("client apply failure is reported to the server", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		b.store.write("accounts", "b1", "name", "Bank");
		a.store.failApply = true;

		const { error, serverError } = await sync(a, b);
		expect(error?.code).toBe("apply-failed");
		expect(serverError?.code).toBe("apply-failed");
	});

	test("connection closed before sync-done rejects", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);

		const { error } = await sync(a, b, {
			dropServerMessage: (msg) => msg.type === "sync-done",
		});
		expect(error?.code).toBe("connection-closed");
	});

	test("times out when the server stops responding", async () => {
		const a = device("A");
		const b = device("B");
		pair(a, b);
		const sessionChannel: SyncChannel = { send() {}, close() {} };
		const session = createSyncClientSession({
			deviceId: a.id,
			store: a.store,
			channel: sessionChannel,
			timeoutMs: 10,
		});
		session.start();
		await expect(session.result).rejects.toMatchObject({ code: "timeout" });
	});

	test("out-of-order message is a protocol error", async () => {
		const b = device("B");
		const sent: SyncSessionMessage[] = [];
		let errorCode: string | undefined;
		const session = createSyncServerSession({
			deviceId: b.id,
			store: b.store,
			channel: { send: (m) => sent.push(m), close() {} },
			onError: (e) => {
				errorCode = e.code;
			},
		});
		await session.handle({ type: "sync-done", received: 0, sent: 0 });
		expect(errorCode).toBe("protocol-error");
		expect(sent).toEqual([
			expect.objectContaining({ type: "sync-error", code: "protocol-error" }),
		]);
	});
});
