export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
	income: "Income",
	expense: "Expense",
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
	income: "green-500",
	expense: "red-500",
};
