export const CATEGORY_TYPES = [
	"income",
	"expense",
	"transfer",
	"savings",
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
	income: "Income",
	expense: "Expense",
	transfer: "Transfer",
	savings: "Savings",
};

export const CATEGORY_TYPE_COLORS: Record<CategoryType, string> = {
	income: "green-500",
	expense: "red-500",
	transfer: "blue-500",
	savings: "yellow-500",
};
