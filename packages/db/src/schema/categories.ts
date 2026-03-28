import {
	CATEGORY_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
} from "@finance-tracker/constants";
import { createId } from "@paralleldrive/cuid2";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamp } from "../utils";

export const categories = sqliteTable(
	"categories",
	{
		id: text("id")
			.primaryKey()
			.$default(() => createId()),
		name: text("name").notNull().default(""),
		icon: text("icon", { enum: ICON_NAMES }).notNull().default("Wallet"),
		color: text("color", { enum: COLOR_VALUES }).notNull().default("#ef4444"),
		type: text("type", { enum: CATEGORY_TYPES }).notNull().default("income"),
		...timestamp,
	},
	(table) => [index("idx_categories_type").on(table.type)],
);
