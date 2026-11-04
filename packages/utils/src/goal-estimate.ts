import { addDays, differenceInCalendarDays } from "date-fns";
import { median, percentile } from "./stats";

const DAYS_PER_YEAR = 365.25;
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;
const MAX_DAYS_IN_DAYS_UNIT = 59;
const DURATION_CAP_YEARS = 50;

export type GoalEstimateStatus = "reached" | "estimated" | "no-surplus";

export interface GoalEstimate {
	status: GoalEstimateStatus;
	days: number | null;
	estimatedDate: Date | null;
	/** minDays comes from the optimistic (P75) rate, maxDays from the conservative (P25) rate. */
	range: { minDays: number | null; maxDays: number | null };
	isRough: boolean;
}

export function estimateGoalCompletion({
	remaining,
	monthlyRates,
	today,
}: {
	remaining: number;
	monthlyRates: number[];
	today: Date;
}): GoalEstimate {
	const isRough = monthlyRates.length < 3;

	if (remaining <= 0) {
		return {
			status: "reached",
			days: 0,
			estimatedDate: today,
			range: { minDays: 0, maxDays: 0 },
			isRough: false,
		};
	}

	const daysAt = (monthlyRate: number | null) =>
		monthlyRate === null || monthlyRate <= 0
			? null
			: Math.ceil(remaining / ((monthlyRate * 12) / DAYS_PER_YEAR));

	const days = daysAt(median(monthlyRates));

	if (days === null) {
		return {
			status: "no-surplus",
			days: null,
			estimatedDate: null,
			range: { minDays: null, maxDays: null },
			isRough,
		};
	}

	return {
		status: "estimated",
		days,
		estimatedDate: addDays(today, days),
		range: {
			minDays: daysAt(percentile(monthlyRates, 75)),
			maxDays: daysAt(percentile(monthlyRates, 25)),
		},
		isRough,
	};
}

const MIN_REAL_MONTHS = 3;
const INSIGHT_THRESHOLD = 0.1;

export interface GoalPace {
	source: "real" | "potential";
	rates: number[];
	showInsight: boolean;
	realMonthly: number | null;
	potentialMonthly: number | null;
}

/**
 * Real pace (actual monthly progress) once the goal has ≥ 3 months of data, otherwise
 * potential pace (monthly surplus × allocation). Insight flags real pace lagging potential by ≥ 10%.
 */
export function pickGoalPace({
	realRates,
	monthlySurplus,
	allocationPercent,
}: {
	realRates: number[];
	monthlySurplus: number[];
	allocationPercent: number;
}): GoalPace {
	const potentialRates = monthlySurplus.map(
		(surplus) => (surplus * allocationPercent) / 100,
	);
	const realMonthly = median(realRates);
	const potentialMonthly = median(potentialRates);
	const useReal = realRates.length >= MIN_REAL_MONTHS;

	return {
		source: useReal ? "real" : "potential",
		rates: useReal ? realRates : potentialRates,
		showInsight:
			useReal &&
			realMonthly !== null &&
			potentialMonthly !== null &&
			potentialMonthly > 0 &&
			potentialMonthly - realMonthly >=
				Math.abs(realMonthly) * INSIGHT_THRESHOLD,
		realMonthly,
		potentialMonthly,
	};
}

export interface TargetDateGap {
	/** Amount needed per month to hit the target date; null once the date has passed. */
	requiredMonthly: number | null;
	/** Extra per month needed on top of the current pace (0 when on track); null once the date has passed. */
	gap: number | null;
	onTrack: boolean;
	isPast: boolean;
}

export function getTargetDateGap({
	remaining,
	targetDate,
	monthlyRate,
	today,
}: {
	remaining: number;
	targetDate: Date;
	monthlyRate: number;
	today: Date;
}): TargetDateGap {
	const daysLeft = differenceInCalendarDays(targetDate, today);

	if (daysLeft <= 0) {
		return {
			requiredMonthly: null,
			gap: null,
			onTrack: remaining <= 0,
			isPast: true,
		};
	}

	const requiredMonthly = Math.max(remaining, 0) / (daysLeft / DAYS_PER_MONTH);
	const gap = Math.max(requiredMonthly - monthlyRate, 0);

	return { requiredMonthly, gap, onTrack: gap === 0, isPast: false };
}

export interface DurationParts {
	unit: "days" | "months" | "yearsMonths" | "overCap";
	years: number;
	months: number;
	days: number;
}

/**
 * Splits a day count into display parts without false precision: days below 60, otherwise
 * months rounded up (carried into years from 12), capped beyond 50 years.
 */
export function getDurationParts(days: number): DurationParts {
	if (days <= MAX_DAYS_IN_DAYS_UNIT) {
		return { unit: "days", years: 0, months: 0, days };
	}

	if (days > DURATION_CAP_YEARS * DAYS_PER_YEAR) {
		return { unit: "overCap", years: DURATION_CAP_YEARS, months: 0, days: 0 };
	}

	const totalMonths = Math.ceil(days / DAYS_PER_MONTH);

	if (totalMonths < 12) {
		return { unit: "months", years: 0, months: totalMonths, days: 0 };
	}

	return {
		unit: "yearsMonths",
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
		days: 0,
	};
}
