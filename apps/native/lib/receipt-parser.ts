import type { SupportedCurrency } from "@finance-tracker/constants";
import currency from "currency.js";
import { isValid, type Locale, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export type ParsedReceipt = {
	amount: number | null;
	note: string | null;
	date: number | null;
	currency: SupportedCurrency | null;
};

const TOTAL_KEYWORDS =
	/\b(grand\s*total|total\s*belanja|total\s*bayar|total\s*harga|jumlah\s*bayar|jumlah\s*tagihan|jumlah|total)\b/i;

// Matches any number with separators, optionally preceded by a currency symbol
const AMOUNT_PATTERN =
	/(?:rp\.?\s?|s\$|a\$|rm\s?|\$|€|£|¥)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/gi;

// Date candidates — find substrings that look like dates
const DATE_CANDIDATE_PATTERNS = [
	/\d{2}[/-]\d{2}[/-]\d{4}/, // DD/MM/YYYY or DD-MM-YYYY
	/\d{4}[/-]\d{2}[/-]\d{2}/, // YYYY-MM-DD
	/\d{1,2}\s+\w{3,}\s+\d{4}/, // DD Mon YYYY (English or Indonesian)
];

const DATE_FORMATS: { fmt: string; locale?: Locale }[] = [
	{ fmt: "dd/MM/yyyy" },
	{ fmt: "dd-MM-yyyy" },
	{ fmt: "yyyy-MM-dd" },
	{ fmt: "yyyy/MM/dd" },
	{ fmt: "dd MMM yyyy" },
	{ fmt: "dd MMMM yyyy" },
	{ fmt: "dd MMM yyyy", locale: idLocale },
	{ fmt: "dd MMMM yyyy", locale: idLocale },
];

// Ordered from most to least specific to avoid false positives
const CURRENCY_DETECTION: { pattern: RegExp; code: SupportedCurrency }[] = [
	{ pattern: /\bidr\b/i, code: "IDR" },
	{ pattern: /\busd\b/i, code: "USD" },
	{ pattern: /\bsgd\b/i, code: "SGD" },
	{ pattern: /\bmyr\b/i, code: "MYR" },
	{ pattern: /\beur\b/i, code: "EUR" },
	{ pattern: /\bgbp\b/i, code: "GBP" },
	{ pattern: /\bjpy\b/i, code: "JPY" },
	{ pattern: /\baud\b/i, code: "AUD" },
	// Symbols — longer/more specific first
	{ pattern: /s\$\s?\d/, code: "SGD" },
	{ pattern: /a\$\s?\d/i, code: "AUD" },
	{ pattern: /\brp\.?\s?\d/i, code: "IDR" },
	{ pattern: /\brm\s?\d/i, code: "MYR" },
	{ pattern: /€\s?\d/, code: "EUR" },
	{ pattern: /£\s?\d/, code: "GBP" },
	{ pattern: /¥\s?\d/, code: "JPY" },
	{ pattern: /\$\s?\d/, code: "USD" },
	// Indonesian store names → IDR (no symbol on receipt)
	{ pattern: /indomaret|alfamart|alfamidi|minimarket|swalayan/i, code: "IDR" },
	// Dot-as-thousands pattern (e.g. 89.750, 1.250.000) → IDR
	{ pattern: /\d{1,3}(?:\.\d{3}){1,}/, code: "IDR" },
];

function detectCurrency(text: string): SupportedCurrency | null {
	for (const { pattern, code } of CURRENCY_DETECTION) {
		if (pattern.test(text)) return code;
	}
	return null;
}

function parseAmount(
	raw: string,
	curr: SupportedCurrency | null,
): number | null {
	if (!raw.trim()) return null;

	let val: number;
	if (curr === "IDR") {
		// IDR: dot = thousand separator, comma = decimal separator
		// e.g. "89.750" → 89750, "1.250.000" → 1250000
		val = currency(raw, { separator: ".", decimal: "," }).value;
	} else {
		// All others: comma = thousand separator, dot = decimal separator
		// e.g. "$1,234.56" → 1234.56, "1.50" → 1.50
		val = currency(raw).value;
	}

	return val > 0 ? val : null;
}

function extractAmount(
	lines: string[],
	currency: SupportedCurrency | null,
): number | null {
	// Find the last line containing a total keyword
	let lastTotalIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (TOTAL_KEYWORDS.test(lines[i])) {
			lastTotalIdx = i;
		}
	}

	const candidates =
		lastTotalIdx >= 0
			? [lines[lastTotalIdx], lines[lastTotalIdx + 1] ?? ""].join(" ")
			: lines.join(" ");

	// Collect all number matches, pick the last one (most likely the total)
	const matches = [...candidates.matchAll(AMOUNT_PATTERN)];
	if (!matches.length) return null;

	// The last numeric match on a total line is usually the grand total
	const lastMatch = matches[matches.length - 1];
	return parseAmount(lastMatch[0], currency);
}

function extractMerchant(lines: string[]): string | null {
	const SKIP_PATTERNS = [
		/^\d/, // starts with number
		/telp|phone|hp|fax/i,
		/jl\.|jalan|street|st\./i,
		/receipt|struk|kasir|cashier/i,
		/npwp|tax|pajak/i,
		/^\s*$/, // blank
	];

	for (const line of lines.slice(0, 5)) {
		const trimmed = line.trim();
		if (trimmed.length < 3) continue;
		if (SKIP_PATTERNS.some((p) => p.test(trimmed))) continue;
		// Skip lines that look like pure prices
		if (/^\d+[.,]\d+$/.test(trimmed)) continue;
		return trimmed;
	}
	return null;
}

function extractDate(lines: string[]): number | null {
	const fullText = lines.join(" ");
	for (const candidatePattern of DATE_CANDIDATE_PATTERNS) {
		const match = fullText.match(candidatePattern);
		if (!match) continue;
		const candidate = match[0];
		for (const { fmt, locale } of DATE_FORMATS) {
			const parsed = parse(
				candidate,
				fmt,
				new Date(),
				locale ? { locale } : {},
			);
			if (isValid(parsed)) return parsed.getTime();
		}
	}
	return null;
}

export function parseReceipt(rawText: string): ParsedReceipt {
	const lines = rawText
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	const currency = detectCurrency(rawText);

	return {
		amount: extractAmount(lines, currency),
		note: extractMerchant(lines),
		date: extractDate(lines) ?? Date.now(),
		currency,
	};
}
