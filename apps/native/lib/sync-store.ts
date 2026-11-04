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
import type { DB } from "@op-engineering/op-sqlite";

/** The slice of an op-sqlite connection the store needs. */
export type OpSqliteHandle = Pick<DB, "execute" | "executeBatch">;

/** `SyncStore` over a cr-sqlite enabled op-sqlite connection (CRDT tables registered). */
export function createOpSqliteSyncStore(
	sqlite: OpSqliteHandle,
	db: AnyDatabase,
): SyncStore {
	let schemaHash: string | undefined;

	async function first<T>(sql: string): Promise<T> {
		const { rows } = await sqlite.execute(sql);
		return rows[0] as T;
	}

	return {
		async getSiteId() {
			return (await first<{ site_id: string }>(SITE_ID_SQL)).site_id;
		},
		async getDbVersion() {
			return (await first<{ db_version: number }>(DB_VERSION_SQL)).db_version;
		},
		async getSchemaHash() {
			if (schemaHash) return schemaHash;
			const tables: Record<string, string[]> = {};
			for (const table of CRDT_TABLES) {
				const { rows } = await sqlite.execute(TABLE_COLUMNS_SQL, [table]);
				tables[table] = rows.map((r) => r.name as string);
			}
			schemaHash = computeSchemaHash(tables);
			return schemaHash;
		},
		async getChanges(since, excludeSiteId) {
			const { rows } = await sqlite.execute(GET_CHANGES_SQL, [
				since,
				excludeSiteId,
				excludeSiteId,
			]);
			return rows as unknown as CRChange[];
		},
		async applyChanges(changes) {
			// op-sqlite rejects an empty batch
			if (changes.length === 0) return;
			// One prepared statement run per row inside a single transaction; rolls back and throws on failure
			await sqlite.executeBatch([
				[APPLY_CHANGE_SQL, changes.map((c) => [...changeToParams(c)])],
			]);
		},
		getPeer: (deviceId) => getPeerSyncState(db, deviceId),
		savePeerState: (deviceId, state) => savePeerSyncState(db, deviceId, state),
	};
}
