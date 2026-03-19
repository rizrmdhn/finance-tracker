import type { TransactionType } from "@finance-tracker/constants";
import type { transactions } from "@finance-tracker/db";

export type { TransactionType };

export type Transaction = typeof transactions.$inferSelect;

export interface TransactionSummaryItem {
	type: TransactionType;
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
