import { describe, expect, test } from "bun:test";
import {
	estimateGoalCompletion,
	getDurationParts,
	getTargetDateGap,
	pickGoalPace,
} from "./goal-estimate";

const today = new Date(2026, 10, 4);

describe("estimateGoalCompletion", () => {
	test("remaining <= 0 is reached", () => {
		for (const remaining of [0, -500_000]) {
			expect(
				estimateGoalCompletion({
					remaining,
					monthlyRates: [1_000_000],
					today,
				}),
			).toEqual({
				status: "reached",
				days: 0,
				estimatedDate: today,
				range: { minDays: 0, maxDays: 0 },
				isRough: false,
			});
		}
	});

	test("no rates is no-surplus", () => {
		const result = estimateGoalCompletion({
			remaining: 1_000_000,
			monthlyRates: [],
			today,
		});
		expect(result.status).toBe("no-surplus");
		expect(result.days).toBeNull();
		expect(result.estimatedDate).toBeNull();
		expect(result.range).toEqual({ minDays: null, maxDays: null });
		expect(result.isRough).toBe(true);
	});

	test("median <= 0 is no-surplus", () => {
		for (const monthlyRates of [
			[0, 0, 0],
			[-1_000_000, 500_000, -200_000],
		]) {
			const result = estimateGoalCompletion({
				remaining: 1_000_000,
				monthlyRates,
				today,
			});
			expect(result.status).toBe("no-surplus");
			expect(result.days).toBeNull();
			expect(result.isRough).toBe(false);
		}
	});

	test("converts monthly rate to days with 365.25-day years", () => {
		// 1,000,000/month → 1 month of 30.4375 days per 1,000,000 → 3,000,000 = 91.3125 → 92 days
		const result = estimateGoalCompletion({
			remaining: 3_000_000,
			monthlyRates: [1_000_000, 1_000_000, 1_000_000],
			today,
		});
		expect(result.status).toBe("estimated");
		expect(result.days).toBe(92);
		expect(result.estimatedDate).toEqual(new Date(2026, 10, 4 + 92));
		expect(result.isRough).toBe(false);
	});

	test("fewer than 3 months of data is rough", () => {
		const result = estimateGoalCompletion({
			remaining: 3_000_000,
			monthlyRates: [1_000_000, 1_000_000],
			today,
		});
		expect(result.status).toBe("estimated");
		expect(result.isRough).toBe(true);
	});

	test("THR outlier: uses the median (2.05M), not the mean (2.38M)", () => {
		const result = estimateGoalCompletion({
			remaining: 12_000_000,
			monthlyRates: [
				2_100_000, 1_800_000, 2_500_000, 900_000, 2_000_000, 5_000_000,
			],
			today,
		});
		// median 2.05M → 365.25 / 2.05 = 178.17 → 179 days (mean would give 154)
		expect(result.status).toBe("estimated");
		expect(result.days).toBe(179);
		expect(result.estimatedDate).toEqual(new Date(2026, 10, 4 + 179));
		// P75 = 2.4M → 152.19 → 153; P25 = 1.85M → 197.43 → 198
		expect(result.range).toEqual({ minDays: 153, maxDays: 198 });
		expect(result.isRough).toBe(false);
	});

	test("conservative bound is null when the P25 rate is <= 0", () => {
		const result = estimateGoalCompletion({
			remaining: 1_000_000,
			monthlyRates: [-3_000_000, -1_000_000, 1_000_000, 2_000_000, 3_000_000],
			today,
		});
		expect(result.status).toBe("estimated");
		expect(result.range.maxDays).toBeNull();
		expect(result.range.minDays).not.toBeNull();
	});

	test("very slow pace returns raw days beyond the 50-year display cap", () => {
		const result = estimateGoalCompletion({
			remaining: 100_000_000,
			monthlyRates: [100_000, 100_000, 100_000],
			today,
		});
		// 1000 months × 30.4375 = 30,437.5 → 30,438 days (~83 years); capping is a display concern
		expect(result.status).toBe("estimated");
		expect(result.days).toBe(30_438);
		expect(result.days).toBeGreaterThan(50 * 365.25);
		expect(result.estimatedDate).toEqual(new Date(2026, 10, 4 + 30_438));
	});
});

describe("pickGoalPace", () => {
	const monthlySurplus = [4_000_000, 2_000_000, 3_000_000, 5_000_000];

	test("new goal (< 3 months of real data) uses potential pace", () => {
		const result = pickGoalPace({
			realRates: [1_000_000, 1_500_000],
			monthlySurplus,
			allocationPercent: 50,
		});
		expect(result).toEqual({
			source: "potential",
			rates: [2_000_000, 1_000_000, 1_500_000, 2_500_000],
			showInsight: false,
			realMonthly: 1_250_000,
			potentialMonthly: 1_750_000,
		});
	});

	test("goal with no real data yet uses potential pace", () => {
		const result = pickGoalPace({
			realRates: [],
			monthlySurplus,
			allocationPercent: 100,
		});
		expect(result.source).toBe("potential");
		expect(result.rates).toEqual(monthlySurplus);
		expect(result.realMonthly).toBeNull();
		expect(result.showInsight).toBe(false);
	});

	test("mature goal (>= 3 months) uses real pace and shows insight when potential is >= 10% higher", () => {
		const realRates = [1_000_000, 1_200_000, 800_000];
		const result = pickGoalPace({
			realRates,
			monthlySurplus,
			allocationPercent: 100,
		});
		expect(result.source).toBe("real");
		expect(result.rates).toEqual(realRates);
		expect(result.realMonthly).toBe(1_000_000);
		expect(result.potentialMonthly).toBe(3_500_000);
		expect(result.showInsight).toBe(true);
	});

	test("insight threshold is inclusive at exactly 10%", () => {
		const base = { realRates: [1_000_000, 1_000_000, 1_000_000] };
		expect(
			pickGoalPace({
				...base,
				monthlySurplus: [1_100_000],
				allocationPercent: 100,
			}).showInsight,
		).toBe(true);
		expect(
			pickGoalPace({
				...base,
				monthlySurplus: [1_090_000],
				allocationPercent: 100,
			}).showInsight,
		).toBe(false);
	});

	test("real >= potential shows no insight", () => {
		const result = pickGoalPace({
			realRates: [3_000_000, 4_000_000, 5_000_000],
			monthlySurplus,
			allocationPercent: 100,
		});
		expect(result.source).toBe("real");
		expect(result.showInsight).toBe(false);
	});

	test("no insight when potential pace is not positive", () => {
		const result = pickGoalPace({
			realRates: [-500_000, -200_000, -300_000],
			monthlySurplus: [-100_000, 0, -50_000],
			allocationPercent: 100,
		});
		expect(result.source).toBe("real");
		expect(result.showInsight).toBe(false);
	});
});

describe("getTargetDateGap", () => {
	test("target date in the past is isPast", () => {
		expect(
			getTargetDateGap({
				remaining: 5_000_000,
				targetDate: new Date(2026, 9, 1),
				monthlyRate: 1_000_000,
				today,
			}),
		).toEqual({
			requiredMonthly: null,
			gap: null,
			onTrack: false,
			isPast: true,
		});
	});

	test("target date of today is isPast", () => {
		const result = getTargetDateGap({
			remaining: 5_000_000,
			targetDate: new Date(2026, 10, 4, 23, 59),
			monthlyRate: 1_000_000,
			today,
		});
		expect(result.isPast).toBe(true);
	});

	test("past target with nothing remaining is still on track", () => {
		const result = getTargetDateGap({
			remaining: 0,
			targetDate: new Date(2026, 9, 1),
			monthlyRate: 0,
			today,
		});
		expect(result).toEqual({
			requiredMonthly: null,
			gap: null,
			onTrack: true,
			isPast: true,
		});
	});

	test("on track when pace covers the required monthly amount", () => {
		// 2026-11-04 → 2027-11-04 = 365 days = 11.99 months → ~1,000,684/month
		const result = getTargetDateGap({
			remaining: 12_000_000,
			targetDate: new Date(2027, 10, 4),
			monthlyRate: 1_100_000,
			today,
		});
		expect(result.requiredMonthly).toBeCloseTo(12_000_000 / (365 / 30.4375));
		expect(result.gap).toBe(0);
		expect(result.onTrack).toBe(true);
		expect(result.isPast).toBe(false);
	});

	test("behind when pace is below the required monthly amount", () => {
		// 2026-11-04 → 2027-05-04 = 181 days → 6,000,000 / (181 / 30.4375) ≈ 1,008,978/month
		const result = getTargetDateGap({
			remaining: 6_000_000,
			targetDate: new Date(2027, 4, 4),
			monthlyRate: 600_000,
			today,
		});
		const required = 6_000_000 / (181 / 30.4375);
		expect(result.requiredMonthly).toBeCloseTo(required);
		expect(result.gap).toBeCloseTo(required - 600_000);
		expect(result.onTrack).toBe(false);
		expect(result.isPast).toBe(false);
	});

	test("nothing remaining with a future target needs nothing", () => {
		const result = getTargetDateGap({
			remaining: -100_000,
			targetDate: new Date(2027, 4, 4),
			monthlyRate: 0,
			today,
		});
		expect(result).toEqual({
			requiredMonthly: 0,
			gap: 0,
			onTrack: true,
			isPast: false,
		});
	});
});

describe("getDurationParts", () => {
	test("0 days (reached) is days", () => {
		expect(getDurationParts(0)).toEqual({
			unit: "days",
			years: 0,
			months: 0,
			days: 0,
		});
	});

	test("59 days stays in days", () => {
		expect(getDurationParts(59)).toEqual({
			unit: "days",
			years: 0,
			months: 0,
			days: 59,
		});
	});

	test("60 days switches to months, rounded up", () => {
		// 60 / 30.4375 = 1.97 → 2
		expect(getDurationParts(60)).toEqual({
			unit: "months",
			years: 0,
			months: 2,
			days: 0,
		});
	});

	test("months always round up", () => {
		// 183 / 30.4375 = 6.01 → 7
		expect(getDurationParts(183).months).toBe(7);
	});

	test("just under 11 months shows 11 months", () => {
		// 334 / 30.4375 = 10.97 → 11
		expect(getDurationParts(334)).toEqual({
			unit: "months",
			years: 0,
			months: 11,
			days: 0,
		});
	});

	test("over 11 months rounds up to 12 and carries into 1 year", () => {
		// 335 / 30.4375 = 11.006 → 12 → 1 year 0 months
		expect(getDurationParts(335)).toEqual({
			unit: "yearsMonths",
			years: 1,
			months: 0,
			days: 0,
		});
		expect(getDurationParts(365)).toEqual({
			unit: "yearsMonths",
			years: 1,
			months: 0,
			days: 0,
		});
	});

	test("years and months", () => {
		// 457 / 30.4375 = 15.01 → 16 → 1 year 4 months
		expect(getDurationParts(457)).toEqual({
			unit: "yearsMonths",
			years: 1,
			months: 4,
			days: 0,
		});
	});

	test("exactly 50 years is still shown", () => {
		// 18,262 days = 599.98 months → 600 → 50 years 0 months
		expect(getDurationParts(18_262)).toEqual({
			unit: "yearsMonths",
			years: 50,
			months: 0,
			days: 0,
		});
	});

	test("over 50 years is capped", () => {
		expect(getDurationParts(18_263)).toEqual({
			unit: "overCap",
			years: 50,
			months: 0,
			days: 0,
		});
		expect(getDurationParts(1_000_000).unit).toBe("overCap");
	});
});
