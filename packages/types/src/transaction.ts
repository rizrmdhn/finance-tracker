import type { transactions } from "@finance-tracker/db";

export type Transaction = typeof transactions.$inferSelect;
