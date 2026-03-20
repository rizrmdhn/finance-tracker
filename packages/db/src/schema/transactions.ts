import {
	CATEGORY_COLORS,
	CATEGORY_ICONS,
	CATEGORY_TYPES,
} from "@finance-tracker/constants";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const ICON_NAMES = CATEGORY_ICONS.map((i) => i.name) as [string, ...string[]];
const COLOR_VALUES = CATEGORY_COLORS.map((c) => c.value) as [
	string,
	...string[],
];

export const transactions = sqliteTable("transactions", {
	id: text("id")
		.primaryKey()
		.$default(() => createId()),
	amount: real("amount").notNull(),
	note: text("note"),
	categoryId: text("category_id").references(() => categories.id),
	tags: text("tags"),
	date: integer("date").notNull(),
	createdAt: integer("created_at").$default(() => Date.now()),
});

export const categories = sqliteTable("categories", {
	id: text("id")
		.primaryKey()
		.$default(() => createId()),
	name: text("name").notNull(),
	icon: text("icon", { enum: ICON_NAMES }).notNull(),
	color: text("color", { enum: COLOR_VALUES }).notNull(),
	type: text("type", { enum: CATEGORY_TYPES }).notNull(),
});

export const transactionRelations = relations(transactions, ({ one }) => ({
	category: one(categories, {
		fields: [transactions.categoryId],
		references: [categories.id],
	}),
}));
