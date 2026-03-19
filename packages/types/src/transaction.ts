import type { transactions } from "@finance-tracker/db";

export type Transaction = typeof transactions.$inferSelect;

export interface TransactionSummaryItem {
	total: number;
}

export interface TransactionSummary {
	income: number;
	expense: number;
	balance: number;
}

export interface DateRangeFilter {
	from: number;
	to: number;
}
