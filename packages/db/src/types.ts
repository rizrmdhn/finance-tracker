import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema/transactions";

export type AnyDatabase = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;
