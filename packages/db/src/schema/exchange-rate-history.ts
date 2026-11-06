import { SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
import {
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

/**
 * Daily rates against EUR (1 EUR = `rate` `target`), local to each device like `exchange_rates`.
 * `date` is the rate's calendar day as `YYYY-MM-DD`, so it never shifts with the timezone.
 */
export const exchangeRateHistory = sqliteTable(
	"exchange_rate_history",
	{
		target: text("target", { enum: SUPPORTED_CURRENCIES }).notNull(),
		date: text("date").notNull(),
		rate: real("rate").notNull(),
		fetchedAt: integer("fetched_at").notNull(),
	},
	(table) => [primaryKey({ columns: [table.target, table.date] })],
);
