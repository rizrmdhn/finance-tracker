import { addDays } from "date-fns";
import { median, percentile } from "./stats";

const DAYS_PER_YEAR = 365.25;

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
