import type { recurrences } from "@finance-tracker/db";
import type { Account } from "./account";
import type { Category } from "./category";
import type { Transaction } from "./transaction";

export type Recurrence = typeof recurrences.$inferSelect;

export type RecurrenceWithTemplate = Recurrence & {
	templateTransaction: Transaction & {
		category: Category | null;
		account: Account | null;
	};
};
