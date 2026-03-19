import type {
	TransactionSummary,
	TransactionSummaryItem,
} from "@finance-tracker/types";

export function parseTags(tags: string | null): string[] {
	if (!tags) return [];
	try {
		const parsed = JSON.parse(tags) as unknown;
		return Array.isArray(parsed) ? (parsed as string[]) : [];
	} catch {
		return [];
	}
}

export function stringifyTags(tags: string[]): string {
	return JSON.stringify(tags);
}

export function summarizeResults(
	items: TransactionSummaryItem[],
): TransactionSummary {
	let income = 0;
	let expense = 0;

	for (const item of items) {
		if (item.type === "income") income = item.total;
		else if (item.type === "expense") expense = item.total;
	}

	return { income, expense, balance: income - expense };
}
