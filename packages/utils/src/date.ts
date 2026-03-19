import type { DatePeriod } from "@finance-tracker/constants";

export function toUnixMs(date: Date): number {
	return date.getTime();
}

export function fromUnixMs(timestamp: number): Date {
	return new Date(timestamp);
}

export function formatDate(
	timestamp: number,
	options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "short",
		day: "numeric",
	},
	locale = "en-US",
): string {
	return new Intl.DateTimeFormat(locale, options).format(
		new Date(timestamp),
	);
}

export function getDateRange(period: DatePeriod): { from: number; to: number } | null {
	const now = new Date();
	const to = now.getTime();

	if (period === "all") return null;

	const from = new Date(now);

	if (period === "week") {
		from.setDate(from.getDate() - 7);
	} else if (period === "month") {
		from.setMonth(from.getMonth() - 1);
	} else if (period === "year") {
		from.setFullYear(from.getFullYear() - 1);
	}

	return { from: from.getTime(), to };
}

export function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function endOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
}
