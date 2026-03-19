import * as schema from "@finance-tracker/db";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

const sqlite = openDatabaseSync("finance.db", { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
