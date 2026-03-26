import { recurrences } from "../schema";
import type { AnyDatabase } from "../types";

// April 1, 2026 00:00:00 UTC in ms (next run after March salary)
const APR_01_MS = 1775001600000;

export async function seedDefaultRecurrences(db: AnyDatabase) {
	return await db
		.insert(recurrences)
		.values([
			{
				id: "seed_rec_salary",
				templateTransactionId: "seed_tx_recur_salary",
				frequency: "monthly",
				nextRunAt: APR_01_MS,
				isActive: true,
			},
		])
		.onConflictDoNothing()
		.returning();
}
