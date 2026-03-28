import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { timestamp } from "../utils";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { recurrences } from "./recurrences";

export const transactions = sqliteTable(
	"transactions",
	{
		id: text("id")
			.primaryKey()
			.$default(() => createId()),
		amount: real("amount").notNull().default(0),
		note: text("note"),
		categoryId: text("category_id")
			.references(() => categories.id)
			.notNull()
			.default(""),
		accountId: text("account_id")
			.references(() => accounts.id)
			.notNull()
			.default(""),
		toAccountId: text("to_account_id").references(() => accounts.id),
		tags: text("tags"),
		date: integer("date").notNull().default(0),
		...timestamp,
	},
	(table) => [
		index("idx_transactions_category_id").on(table.categoryId),
		index("idx_transactions_account_id").on(table.accountId),
		index("idx_transactions_date").on(table.date),
	],
);

export const transactionRelations = relations(transactions, ({ one }) => ({
	category: one(categories, {
		fields: [transactions.categoryId],
		references: [categories.id],
	}),
	account: one(accounts, {
		fields: [transactions.accountId],
		references: [accounts.id],
	}),
	toAccount: one(accounts, {
		fields: [transactions.toAccountId],
		references: [accounts.id],
	}),
	recurrence: one(recurrences, {
		fields: [transactions.id],
		references: [recurrences.templateTransactionId],
	}),
}));
