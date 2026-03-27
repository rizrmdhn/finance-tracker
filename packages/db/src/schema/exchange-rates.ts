import { SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const exchangeRates = sqliteTable(
	"exchange_rates",
	{
		base: text("base", { enum: SUPPORTED_CURRENCIES }).notNull(),
		target: text("target", { enum: SUPPORTED_CURRENCIES }).notNull(),
		rate: real("rate").notNull(),
		fetchedAt: integer("fetched_at").notNull(),
	},
	(table) => [primaryKey({ columns: [table.base, table.target] })],
);
