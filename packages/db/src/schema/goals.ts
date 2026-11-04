import {
	COLOR_VALUES,
	GOAL_STATUSES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
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
import { goalContributions } from "./goal-contributions";

export const goals = sqliteTable(
	"goals",
	{
		id: text("id")
			.primaryKey()
			.$default(() => createId()),
		name: text("name").notNull().default(""),
		icon: text("icon", { enum: ICON_NAMES }).notNull().default("Gift"),
		color: text("color", { enum: COLOR_VALUES }).notNull().default("#ef4444"),
		imageUri: text("image_uri"),
		productUrl: text("product_url"),
		targetAmount: real("target_amount").notNull().default(0),
		currency: text("currency", { enum: SUPPORTED_CURRENCIES })
			.notNull()
			.default("IDR"),
		targetDate: integer("target_date"), // unix ms, nullable
		linkedAccountId: text("linked_account_id"),
		allocationPercent: real("allocation_percent").notNull().default(100),
		priority: integer("priority").notNull().default(0),
		status: text("status", { enum: GOAL_STATUSES }).notNull().default("active"),
		purchasedAt: integer("purchased_at"), // unix ms, nullable
		...timestamp,
	},
	(table) => [
		index("idx_goals_linked_account_id").on(table.linkedAccountId),
		index("idx_goals_status").on(table.status),
	],
);

export const goalRelations = relations(goals, ({ one, many }) => ({
	linkedAccount: one(accounts, {
		fields: [goals.linkedAccountId],
		references: [accounts.id],
	}),
	contributions: many(goalContributions),
}));
