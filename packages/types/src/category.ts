import type { CategoryType } from "@finance-tracker/constants";
import type { categories } from "@finance-tracker/db";

export type { CategoryType };

export type Category = typeof categories.$inferSelect;
