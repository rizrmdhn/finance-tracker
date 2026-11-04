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
import { goals } from "./goals";

export const goalContributions = sqliteTable(
	"goal_contributions",
	{
		id: text("id")
			.primaryKey()
			.$default(() => createId()),
		goalId: text("goal_id").notNull().default(""),
		accountId: text("account_id").notNull().default(""),
		amount: real("amount").notNull().default(0), // negative = withdraw
		note: text("note"),
		date: integer("date").notNull().default(0), // unix ms
		...timestamp,
	},
	(table) => [
		index("idx_goal_contributions_goal_id").on(table.goalId),
		index("idx_goal_contributions_account_id").on(table.accountId),
	],
);

export const goalContributionRelations = relations(
	goalContributions,
	({ one }) => ({
		goal: one(goals, {
			fields: [goalContributions.goalId],
			references: [goals.id],
		}),
		account: one(accounts, {
			fields: [goalContributions.accountId],
			references: [accounts.id],
		}),
	}),
);
