import { SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
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
import { categories } from "./categories";

export const budgets = sqliteTable(
	"budgets",
	{
		id: text("id")
			.primaryKey()
			.$default(() => createId()),
		categoryId: text("category_id")
			.references(() => categories.id)
			.notNull()
			.default(""),
		amount: real("amount").notNull().default(0),
		currency: text("currency", { enum: SUPPORTED_CURRENCIES })
			.notNull()
			.default("IDR"),
		period: text("period", { enum: ["monthly", "weekly"] })
			.notNull()
			.default("monthly"),
		startDate: integer("start_date").notNull().default(0), // Unix timestamp
		...timestamp,
	},
	(table) => [index("idx_budgets_category_id").on(table.categoryId)],
);

export const budgetRelations = relations(budgets, ({ one }) => ({
	category: one(categories, {
		fields: [budgets.categoryId],
		references: [categories.id],
	}),
}));
