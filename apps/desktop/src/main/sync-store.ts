import { CRDT_TABLES } from "@finance-tracker/constants";
import type { AnyDatabase } from "@finance-tracker/db";
import { getPeerSyncState, savePeerSyncState } from "@finance-tracker/queries";
import {
	APPLY_CHANGE_SQL,
	type CRChange,
	changeToParams,
	computeSchemaHash,
	DB_VERSION_SQL,
	GET_CHANGES_SQL,
	SITE_ID_SQL,
	type SyncStore,
	TABLE_COLUMNS_SQL,
} from "@finance-tracker/sync";

/** The slice of a synchronous SQLite driver (better-sqlite3) the store needs. */
export interface SqliteHandle {
	prepare(sql: string): {
		all(...params: unknown[]): unknown[];
		get(...params: unknown[]): unknown;
		run(...params: unknown[]): unknown;
	};
	transaction(fn: () => void): () => void;
}

/** `SyncStore` over a cr-sqlite enabled connection (extension loaded, CRDT tables registered). */
export function createSqliteSyncStore(
	sqlite: SqliteHandle,
	db: AnyDatabase,
): SyncStore {
	let schemaHash: string | undefined;

	return {
		async getSiteId() {
			return (sqlite.prepare(SITE_ID_SQL).get() as { site_id: string }).site_id;
		},
		async getDbVersion() {
			return (sqlite.prepare(DB_VERSION_SQL).get() as { db_version: number })
				.db_version;
		},
		async getSchemaHash() {
			schemaHash ??= computeSchemaHash(
				Object.fromEntries(
					CRDT_TABLES.map((table) => [
						table,
						(
							sqlite.prepare(TABLE_COLUMNS_SQL).all(table) as { name: string }[]
						).map((c) => c.name),
					]),
				),
			);
			return schemaHash;
		},
		async getChanges(since, excludeSiteId) {
			return sqlite
				.prepare(GET_CHANGES_SQL)
				.all(since, excludeSiteId, excludeSiteId) as CRChange[];
		},
		async applyChanges(changes) {
			const stmt = sqlite.prepare(APPLY_CHANGE_SQL);
			sqlite.transaction(() => {
				for (const c of changes) stmt.run(...changeToParams(c));
			})();
		},
		getPeer: (deviceId) => getPeerSyncState(db, deviceId),
		savePeerState: (deviceId, state) => savePeerSyncState(db, deviceId, state),
	};
}
