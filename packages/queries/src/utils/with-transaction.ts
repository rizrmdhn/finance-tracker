import type { AnyDatabase } from "@finance-tracker/db";
import { sql } from "drizzle-orm";

/**
 * Runs `fn` between BEGIN / COMMIT, rolling back when it throws.
 *
 * Not `db.transaction()`: with an async callback, drizzle's better-sqlite3 driver throws
 * ("Transaction function cannot return a promise") and its op-sqlite / bun-sqlite drivers
 * commit before the awaited statements run. Statements of other requests issued while
 * `fn` awaits share the transaction (one connection per app).
 */
export async function withTransaction<T>(
	db: AnyDatabase,
	fn: () => Promise<T>,
): Promise<T> {
	await db.run(sql`BEGIN`);
	try {
		const result = await fn();
		await db.run(sql`COMMIT`);
		return result;
	} catch (err) {
		await db.run(sql`ROLLBACK`);
		throw err;
	}
}
