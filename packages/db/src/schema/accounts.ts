import {
	ACCOUNT_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamp } from "../utils";

export const accounts = sqliteTable("accounts", {
	id: text("id")
		.primaryKey()
		.$default(() => createId()),
	name: text("name").notNull().default(""),
	icon: text("icon", { enum: ICON_NAMES }).notNull().default("Wallet"),
	color: text("color", { enum: COLOR_VALUES }).notNull().default("#ef4444"),
	type: text("type", { enum: ACCOUNT_TYPES }).notNull().default("cash"),
	initialBalance: integer("initial_balance").notNull().default(0),
	currency: text("currency", { enum: SUPPORTED_CURRENCIES })
		.notNull()
		.default("IDR"),
	...timestamp,
});
