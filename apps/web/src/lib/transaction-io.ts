import type { TransactionInput } from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { format } from "date-fns";
import { z } from "zod";

// ── Column definitions ────────────────────────────────────────────────────────

export const CSV_HEADERS = [
	"date",
	"amount",
	"note",
	"category",
	"account",
	"toAccount",
	"tags",
] as const;

export type CsvColumn = (typeof CSV_HEADERS)[number];

export const REQUIRED_CSV_COLUMNS: CsvColumn[] = [
	"date",
	"amount",
	"category",
	"account",
];

// ── Shared result type ────────────────────────────────────────────────────────

export type ValidatedImportRow =
	| { ok: true; data: TransactionInput }
	| { ok: false; errors: string[] };

// ── Export ────────────────────────────────────────────────────────────────────

function escapeCSVField(value: string): string {
	if (
		value.includes(",") ||
		value.includes('"') ||
		value.includes("\n") ||
		value.includes("\r")
	) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function tagsToString(tagsJson: string | null): string {
	if (!tagsJson) return "";
	try {
		const arr = JSON.parse(tagsJson) as string[];
		return Array.isArray(arr) ? arr.join(";") : "";
	} catch {
		return "";
	}
}

export function serializeToCSV(
	transactions: Transaction[],
	categoriesMap: Map<string, string>, // id -> name
	accountsMap: Map<string, string>, // id -> name
): string {
	const header = CSV_HEADERS.join(",");
	const rows = transactions.map((tx) => {
		const dateStr = format(new Date(tx.date), "yyyy-MM-dd");
		const amount = String(tx.amount);
		const note = escapeCSVField(tx.note ?? "");
		const category = escapeCSVField(
			categoriesMap.get(tx.categoryId) ?? tx.categoryId,
		);
		const account = escapeCSVField(
			accountsMap.get(tx.accountId) ?? tx.accountId,
		);
		const toAccount = escapeCSVField(
			tx.toAccountId ? (accountsMap.get(tx.toAccountId) ?? tx.toAccountId) : "",
		);
		const tags = escapeCSVField(tagsToString(tx.tags));
		return [dateStr, amount, note, category, account, toAccount, tags].join(
			",",
		);
	});
	return [header, ...rows].join("\n");
}

export function serializeToJSON(transactions: Transaction[]): string {
	return JSON.stringify(transactions, null, 2);
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

export type RawCSVRow = Record<string, string>;

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (inQuotes) {
			if (char === '"') {
				if (line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += char;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
			} else if (char === ",") {
				result.push(current);
				current = "";
			} else {
				current += char;
			}
		}
	}
	result.push(current);
	return result;
}

export function parseCSV(content: string): {
	headers: string[];
	rows: RawCSVRow[];
} {
	// Strip BOM and normalize line endings
	const normalized = content
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const lines = normalized.split("\n").filter((line) => line.trim() !== "");

	if (lines.length === 0) return { headers: [], rows: [] };

	const headers = parseCSVLine(lines[0]).map((h) => h.trim());

	if (lines.length < 2) return { headers, rows: [] };

	const rows = lines.slice(1).map((line) => {
		const values = parseCSVLine(line);
		const row: RawCSVRow = {};
		headers.forEach((header, i) => {
			row[header] = values[i] ?? "";
		});
		return row;
	});

	return { headers, rows };
}

// ── CSV validation ────────────────────────────────────────────────────────────

export const csvImportRowSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
		.transform((s) => new Date(s).getTime()),
	amount: z
		.string()
		.transform((s) => Number.parseFloat(s.replace(/,/g, "")))
		.pipe(z.number().positive("Amount must be a positive number")),
	note: z.string().optional(),
	categoryName: z.string().min(1, "Category is required"),
	accountName: z.string().min(1, "Account is required"),
	toAccountName: z.string().optional(),
	tags: z.string().optional(),
});

export function validateAndResolveCSVRow(
	rawRow: RawCSVRow,
	columnMap: Partial<Record<CsvColumn, string>>,
	categoriesMap: Map<string, string>, // lowercase name -> id
	accountsMap: Map<string, string>, // lowercase name -> id
): ValidatedImportRow {
	const getValue = (col: CsvColumn) => {
		const header = columnMap[col];
		return header ? (rawRow[header] ?? "") : "";
	};

	const rawCategoryName = getValue("category");
	const rawAccountName = getValue("account");
	const rawToAccountName = getValue("toAccount");

	const rawData = {
		date: getValue("date"),
		amount: getValue("amount"),
		note: getValue("note") || undefined,
		categoryName: rawCategoryName,
		accountName: rawAccountName,
		toAccountName: rawToAccountName || undefined,
		tags: getValue("tags") || undefined,
	};

	const parsed = csvImportRowSchema.safeParse(rawData);
	const errors: string[] = [];

	if (!parsed.success) {
		errors.push(...parsed.error.issues.map((e) => e.message));
	}

	const categoryId = categoriesMap.get(rawCategoryName.toLowerCase());
	const accountId = accountsMap.get(rawAccountName.toLowerCase());
	const toAccountId = rawToAccountName
		? accountsMap.get(rawToAccountName.toLowerCase())
		: undefined;

	if (rawCategoryName && !categoryId) {
		errors.push(`Category "${rawCategoryName}" not found`);
	}
	if (rawAccountName && !accountId) {
		errors.push(`Account "${rawAccountName}" not found`);
	}
	if (rawToAccountName && !toAccountId) {
		errors.push(`Account "${rawToAccountName}" not found`);
	}

	if (errors.length > 0) return { ok: false, errors };
	if (!parsed.success || !categoryId || !accountId)
		return { ok: false, errors: ["Unknown validation error"] };

	const { date, amount, note } = parsed.data;
	const tagsRaw = rawData.tags;
	const tags = tagsRaw
		? tagsRaw
				.split(";")
				.map((t) => t.trim())
				.filter(Boolean)
		: undefined;

	return {
		ok: true,
		data: {
			date,
			amount,
			note,
			categoryId,
			accountId,
			toAccountId,
			tags,
		},
	};
}

// ── JSON parsing ──────────────────────────────────────────────────────────────

export const jsonImportRowSchema = z.object({
	amount: z.number().positive("Amount must be a positive number"),
	note: z.string().optional().nullable(),
	categoryId: z.string().min(1, "categoryId is required"),
	accountId: z.string().min(1, "accountId is required"),
	toAccountId: z.string().optional().nullable(),
	tags: z.string().optional().nullable(),
	date: z.number().int().positive("date must be a unix timestamp"),
});

export function parseJSON(content: string): unknown[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error("Invalid JSON: could not parse file content");
	}
	if (!Array.isArray(parsed)) {
		throw new Error("Invalid JSON: expected an array of transactions");
	}
	return parsed;
}

export function validateJSONRow(
	raw: unknown,
	validCategoryIds: Set<string>,
	validAccountIds: Set<string>,
): ValidatedImportRow {
	const parsed = jsonImportRowSchema.safeParse(raw);

	if (!parsed.success) {
		return {
			ok: false,
			errors: parsed.error.issues.map((e) => e.message),
		};
	}

	const { categoryId, accountId, toAccountId, amount, date, note, tags } =
		parsed.data;

	const errors: string[] = [];

	if (!validCategoryIds.has(categoryId)) {
		errors.push(`Category ID "${categoryId}" not found`);
	}
	if (!validAccountIds.has(accountId)) {
		errors.push(`Account ID "${accountId}" not found`);
	}
	if (toAccountId && !validAccountIds.has(toAccountId)) {
		errors.push(`Account ID "${toAccountId}" not found`);
	}

	if (errors.length > 0) return { ok: false, errors };

	let parsedTags: string[] | undefined;
	if (tags) {
		try {
			const arr = JSON.parse(tags) as unknown;
			parsedTags = Array.isArray(arr)
				? (arr as string[]).filter((t) => typeof t === "string")
				: undefined;
		} catch {
			parsedTags = undefined;
		}
	}

	return {
		ok: true,
		data: {
			amount,
			date,
			note: note ?? undefined,
			categoryId,
			accountId,
			toAccountId: toAccountId ?? undefined,
			tags: parsedTags,
		},
	};
}
