import { RECURRENCE_FREQUENCIES } from "@finance-tracker/constants";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamp } from "../utils";
import { transactions } from "./transactions";

export const recurrences = sqliteTable(
	"recurrences",
	{
		id: text("id")
			.primaryKey()
			.$default(() => createId()),
		templateTransactionId: text("template_transaction_id")
			.references(() => transactions.id)
			.notNull(),
		frequency: text("frequency", {
			enum: RECURRENCE_FREQUENCIES,
		}).notNull(),
		nextRunAt: integer("next_run_at").notNull(), // unix ms
		endDate: integer("end_date"), // unix ms, nullable
		isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
		...timestamp,
	},
	(t) => [
		index("idx_recurrences_template_id").on(t.templateTransactionId),
		index("idx_recurrences_next_run_at").on(t.nextRunAt),
	],
);

export const recurrenceRelations = relations(recurrences, ({ one }) => ({
	templateTransaction: one(transactions, {
		fields: [recurrences.templateTransactionId],
		references: [transactions.id],
	}),
}));
