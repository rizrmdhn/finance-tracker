import type { RecurrenceFrequency } from "@finance-tracker/constants";
import {
	type AnyDatabase,
	recurrences,
	transactions,
} from "@finance-tracker/db";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { eq } from "drizzle-orm";
import { getDueRecurrences } from "./recurrence";

function advanceNextRunAt(
	frequency: RecurrenceFrequency,
	from: number,
): number {
	const date = new Date(from);
	switch (frequency) {
		case "daily":
			return addDays(date, 1).getTime();
		case "weekly":
			return addWeeks(date, 1).getTime();
		case "monthly":
			return addMonths(date, 1).getTime();
		case "yearly":
			return addYears(date, 1).getTime();
	}
}

export function computeNextRunAt(
	frequency: RecurrenceFrequency,
	from: number,
): number {
	return advanceNextRunAt(frequency, from);
}

export async function processRecurrences(db: AnyDatabase): Promise<number> {
	const due = await getDueRecurrences(db);
	let spawned = 0;

	for (const rule of due) {
		const tmpl = rule.templateTransaction;

		// Guard: skip if past end date
		if (rule.endDate && rule.nextRunAt > rule.endDate) {
			await db
				.update(recurrences)
				.set({ isActive: false })
				.where(eq(recurrences.id, rule.id));
			continue;
		}

		// Clone template into a new transaction (date = nextRunAt)
		await db.insert(transactions).values({
			amount: tmpl.amount,
			note: tmpl.note,
			categoryId: tmpl.categoryId,
			accountId: tmpl.accountId,
			toAccountId: tmpl.toAccountId,
			tags: tmpl.tags,
			date: rule.nextRunAt,
		});

		// Advance nextRunAt to the next interval
		const next = advanceNextRunAt(
			rule.frequency as RecurrenceFrequency,
			rule.nextRunAt,
		);

		// If the next run would be past the end date, deactivate
		if (rule.endDate && next > rule.endDate) {
			await db
				.update(recurrences)
				.set({ isActive: false, nextRunAt: next })
				.where(eq(recurrences.id, rule.id));
		} else {
			await db
				.update(recurrences)
				.set({ nextRunAt: next })
				.where(eq(recurrences.id, rule.id));
		}

		spawned++;
	}

	return spawned;
}
