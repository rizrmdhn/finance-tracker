import * as schema from "@finance-tracker/db";
import { open } from "@op-engineering/op-sqlite";
import { drizzle } from "drizzle-orm/op-sqlite";

const sqlite = open({ name: "finance.db" });

export const db = drizzle(sqlite, { schema });

/** Raw op-sqlite handle — used for loading SQLite extensions (e.g. cr-sqlite) */
export { sqlite };
