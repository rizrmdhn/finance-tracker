import * as schema from "@finance-tracker/db";
import { type Migration, migrateWithCrr } from "@finance-tracker/db";
import { open } from "@op-engineering/op-sqlite";
import { drizzle } from "drizzle-orm/op-sqlite";
import bundledMigrations from "@/drizzle/migrations";

// op-sqlite loads cr-sqlite on open (package.json "op-sqlite": { "crsqlite": true })
const sqlite = open({ name: "finance.db" });

export const db = drizzle(sqlite, { schema });

/** Raw op-sqlite handle — used for loading SQLite extensions (e.g. cr-sqlite) */
export { sqlite };

/**
 * Applies the bundled drizzle migrations. Not drizzle's op-sqlite migrator: its
 * transaction commits after the first statement, and CRR tables need
 * crsql_begin_alter/commit_alter inside one transaction around the migration.
 */
export function migrateDatabase() {
	const migrations: Migration[] = bundledMigrations.journal.entries.map(
		(entry) => ({
			sql: bundledMigrations.migrations[
				`m${entry.idx.toString().padStart(4, "0")}` as keyof typeof bundledMigrations.migrations
			].split("--> statement-breakpoint"),
			folderMillis: entry.when,
			hash: "",
		}),
	);
	migrateWithCrr(
		{
			exec: (sql) => {
				sqlite.executeSync(sql);
			},
			all: (sql) => sqlite.executeSync(sql).rows,
		},
		migrations,
	);
}
