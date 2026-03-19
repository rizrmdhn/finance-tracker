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
	_items: TransactionSummaryItem[],
): TransactionSummary {
	const income = 0;
	const expense = 0;

	return { income, expense, balance: income - expense };
}
