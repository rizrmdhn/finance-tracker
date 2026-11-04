import { describe, expect, test } from "bun:test";
import { estimateGoalCompletion } from "./goal-estimate";

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
