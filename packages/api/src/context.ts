import type * as schema from "@finance-tracker/db";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export function createContext({
	db,
}: {
	db: BetterSQLite3Database<typeof schema>;
}) {
	return { db };
}

export type Context = ReturnType<typeof createContext>;
