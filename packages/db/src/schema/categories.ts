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
		name: text("name").notNull(),
		icon: text("icon", { enum: ICON_NAMES }).notNull(),
		color: text("color", { enum: COLOR_VALUES }).notNull(),
		type: text("type", { enum: CATEGORY_TYPES }).notNull(),
		...timestamp,
	},
	(table) => [index("idx_categories_type").on(table.type)],
);
