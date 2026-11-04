import { describe, expect, test } from "bun:test";
import { median, percentile } from "./stats";

describe("median", () => {
	test("returns null for empty input", () => {
		expect(median([])).toBeNull();
	});

	test("returns the value for a single element", () => {
		expect(median([7])).toBe(7);
	});

	test("returns the middle value for odd length", () => {
		expect(median([1, 3, 5])).toBe(3);
	});

	test("averages the two middle values for even length", () => {
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	test("sorts unsorted input without mutating it", () => {
		const values = [5, 1, 4, 2, 3];
		expect(median(values)).toBe(3);
		expect(values).toEqual([5, 1, 4, 2, 3]);
	});
});

describe("percentile", () => {
	test("returns null for empty input", () => {
		expect(percentile([], 25)).toBeNull();
	});

	test("returns the value for a single element at any p", () => {
		expect(percentile([7], 0)).toBe(7);
		expect(percentile([7], 25)).toBe(7);
		expect(percentile([7], 100)).toBe(7);
	});

	test("returns min and max at p=0 and p=100", () => {
		expect(percentile([3, 1, 2], 0)).toBe(1);
		expect(percentile([3, 1, 2], 100)).toBe(3);
	});

	test("interpolates linearly between ranks (odd length)", () => {
		// sorted [10, 20, 30, 40, 50]; P25 rank = 1 → 20, P75 rank = 3 → 40
		expect(percentile([50, 10, 40, 20, 30], 25)).toBe(20);
		expect(percentile([50, 10, 40, 20, 30], 75)).toBe(40);
	});

	test("interpolates linearly between ranks (even length)", () => {
		// sorted [10, 20, 30, 40]; P25 rank = 0.75 → 17.5, P75 rank = 2.25 → 32.5
		expect(percentile([40, 10, 30, 20], 25)).toBe(17.5);
		expect(percentile([40, 10, 30, 20], 75)).toBe(32.5);
	});

	test("does not mutate input", () => {
		const values = [3, 1, 2];
		percentile(values, 50);
		expect(values).toEqual([3, 1, 2]);
	});
});
