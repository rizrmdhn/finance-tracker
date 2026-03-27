export type ParsedReceipt = {
	amount: number | null;
	note: string | null;
	date: number | null;
	currency: "IDR" | "USD" | null;
};

const TOTAL_KEYWORDS =
	/\b(grand\s*total|total\s*belanja|total\s*bayar|total\s*harga|jumlah\s*bayar|jumlah\s*tagihan|jumlah|total)\b/i;

const IDR_AMOUNT = /(?:rp\.?\s?)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
const IDR_PLAIN = /(\d{1,3}(?:\.\d{3})+)/;
const USD_AMOUNT = /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;

const DATE_PATTERNS: {
	pattern: RegExp;
	parse: (m: RegExpMatchArray) => Date | null;
}[] = [
	{
		// DD/MM/YYYY or DD-MM-YYYY
		pattern: /(\d{2})[/-](\d{2})[/-](\d{4})/,
		parse: (m) => new Date(+m[3], +m[2] - 1, +m[1]),
	},
	{
		// YYYY-MM-DD
		pattern: /(\d{4})[/-](\d{2})[/-](\d{2})/,
		parse: (m) => new Date(+m[1], +m[2] - 1, +m[3]),
	},
	{
		// DD Mon YYYY (Indonesian months)
		pattern:
			/(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
		parse: (m) => {
			const monthMap: Record<string, number> = {
				jan: 0,
				january: 0,
				feb: 1,
				february: 1,
				mar: 2,
				march: 2,
				apr: 3,
				april: 3,
				mei: 4,
				may: 4,
				jun: 5,
				june: 5,
				jul: 6,
				july: 6,
				agu: 7,
				august: 7,
				sep: 8,
				september: 8,
				okt: 9,
				october: 9,
				nov: 10,
				november: 10,
				des: 11,
				december: 11,
			};
			const month = monthMap[m[2].toLowerCase()];
			if (month === undefined) return null;
			return new Date(+m[3], month, +m[1]);
		},
	},
];

function detectCurrency(text: string): "IDR" | "USD" | null {
	if (/\brp\.?\s?\d|\bidr\b/i.test(text)) return "IDR";
	if (/\$\d|usd\b/i.test(text)) return "USD";
	// Fallback: IDR-style thousands (dots as separators) without explicit symbol
	if (/\d{1,3}(?:\.\d{3}){1,}/.test(text)) return "IDR";
	return null;
}

function parseAmount(
	raw: string,
	currency: "IDR" | "USD" | null,
): number | null {
	if (!raw.trim()) return null;
	if (currency === "IDR") {
		// Remove Rp prefix, then strip thousand separators (dots), treat comma as decimal
		const cleaned = raw
			.replace(/rp\.?\s?/i, "")
			.replace(/\./g, "")
			.replace(",", ".");
		const val = Number.parseFloat(cleaned);
		return Number.isFinite(val) ? val : null;
	}
	// USD: remove $ and commas
	const cleaned = raw.replace(/\$/g, "").replace(/,/g, "");
	const val = Number.parseFloat(cleaned);
	return Number.isFinite(val) ? val : null;
}

function extractAmount(
	lines: string[],
	currency: "IDR" | "USD" | null,
): number | null {
	// Find the last occurrence of a total keyword line and extract amount from it or the next line
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

	// Try IDR with Rp prefix first
	const idrMatch = candidates.match(IDR_AMOUNT);
	if (idrMatch) {
		return parseAmount(idrMatch[0], "IDR");
	}

	// Try USD
	const usdMatch = candidates.match(USD_AMOUNT);
	if (usdMatch) {
		return parseAmount(usdMatch[0], "USD");
	}

	// Try plain IDR thousands (e.g. 45.000)
	const plainMatch = candidates.match(IDR_PLAIN);
	if (plainMatch && currency === "IDR") {
		return parseAmount(plainMatch[0], "IDR");
	}

	return null;
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
		// A valid merchant name is likely all-caps or title-case, not a price
		if (/^\d+[.,]\d+$/.test(trimmed)) continue;
		return trimmed;
	}
	return null;
}

function extractDate(lines: string[]): number | null {
	const fullText = lines.join(" ");
	for (const { pattern, parse } of DATE_PATTERNS) {
		const match = fullText.match(pattern);
		if (match) {
			const date = parse(match);
			if (date && !Number.isNaN(date.getTime())) {
				return date.getTime();
			}
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
