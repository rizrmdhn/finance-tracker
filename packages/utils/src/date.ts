import type { DatePeriod } from "@finance-tracker/constants";
import {
	endOfDay,
	format,
	fromUnixTime,
	getUnixTime,
	startOfDay,
	subMonths,
	subWeeks,
	subYears,
} from "date-fns";

export function toUnixMs(date: Date): number {
	return getUnixTime(date) * 1000;
}

export function fromUnixMs(timestamp: number): Date {
	return fromUnixTime(timestamp / 1000);
}

export function formatDate(timestamp: number, fmt = "MMM d, yyyy"): string {
	return format(fromUnixMs(timestamp), fmt);
}

export function getDateRange(
	period: DatePeriod,
): { from: number; to: number } | null {
	if (period === "all") return null;

	const now = new Date();
	const to = endOfDay(now).getTime();

	const fromMap = {
		week: subWeeks(now, 1),
		month: subMonths(now, 1),
		year: subYears(now, 1),
	};

	return { from: startOfDay(fromMap[period]).getTime(), to };
}

export { endOfDay, startOfDay };
