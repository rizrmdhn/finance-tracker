import { CRDT_TABLES } from "@finance-tracker/constants";

/** A drizzle-kit migration, split on `--> statement-breakpoint`. */
export interface Migration {
	sql: string[];
	folderMillis: number;
	hash: string;
}

/** Synchronous access to the raw SQLite connection (cr-sqlite loaded). */
export interface MigrationConnection {
	exec(sql: string): void;
	all(sql: string): Record<string, unknown>[];
}

const MIGRATIONS_TABLE = "__drizzle_migrations";

/**
 * Applies pending migrations like drizzle's migrator (same `__drizzle_migrations`
 * bookkeeping), in one transaction.
 *
 * Tables that are already CRRs (cr-sqlite) are altered between
 * `crsql_begin_alter` / `crsql_commit_alter`: altering them directly leaves
 * stale triggers (every UPDATE fails) or clock rows for dropped columns
 * (`crsql_changes` stops working). Both calls must run inside the migration
 * transaction, which drizzle's own migrators don't allow.
 *
 * Rows a migration writes into a CRR table are not synced: every device runs
 * the migration itself.
 */
export function migrateWithCrr(
	conn: MigrationConnection,
	migrations: Migration[],
): void {
	conn.exec(
		`CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
	);
	const [last] = conn.all(
		`SELECT created_at FROM "${MIGRATIONS_TABLE}" ORDER BY created_at DESC LIMIT 1`,
	);
	const pending = migrations.filter(
		(m) => last === undefined || Number(last.created_at) < m.folderMillis,
	);
	if (pending.length === 0) return;

	// A table is a CRR once it has a clock table; on a fresh database there are none yet
	const clockTables = CRDT_TABLES.map((t) => `'${t}__crsql_clock'`).join(", ");
	const crrTables = conn
		.all(
			`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${clockTables})`,
		)
		.map((row) => String(row.name).replace(/__crsql_clock$/, ""));

	conn.exec("BEGIN");
	try {
		for (const table of crrTables)
			conn.all(`SELECT crsql_begin_alter('${table}')`);
		for (const migration of pending) {
			for (const statement of migration.sql) conn.exec(statement);
			conn.exec(
				`INSERT INTO "${MIGRATIONS_TABLE}" ("hash", "created_at") VALUES ('${migration.hash}', ${migration.folderMillis})`,
			);
		}
		for (const table of crrTables)
			conn.all(`SELECT crsql_commit_alter('${table}')`);
		conn.exec("COMMIT");
	} catch (err) {
		try {
			conn.exec("ROLLBACK");
		} catch {
			// crsql_commit_alter rolls back itself when it fails
		}
		throw err;
	}
}
