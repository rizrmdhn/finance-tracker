import { describe, expect, test } from "bun:test";
import {
	formatConvertedAmount,
	formatRate,
	getRateChangeDirection,
	resolveRatePair,
} from "./exchange-rate-format";

/** Intl separates some symbols with a no-break space. */
const normalize = (text: string) => text.replace(/ /g, " ");

describe("formatRate", () => {
	test.each([
		[16_712.4, "IDR", "Rp 16.712,40"],
		[150.234, "JPY", "￥150.23"],
		[1.08234, "USD", "$1.0823"],
		[1.5, "USD", "$1.50"],
		[0.0000598, "USD", "$0.0000598"],
		[0.00006, "USD", "$0.000060"],
		[0.923456, "GBP", "£0.9235"],
	] as const)("%d %s → %s", (rate, currency, expected) => {
		expect(normalize(formatRate(rate, currency))).toBe(expected);
	});
});

describe("formatConvertedAmount", () => {
	test("uses the currency's usual decimals from 1 up", () => {
		expect(normalize(formatConvertedAmount(16_712_400.4, "IDR"))).toBe(
			"Rp 16.712.400",
		);
		expect(normalize(formatConvertedAmount(59.8392, "USD"))).toBe("$59.84");
		expect(normalize(formatConvertedAmount(0, "USD"))).toBe("$0.00");
	});

	test("keeps significant digits below 1", () => {
		expect(normalize(formatConvertedAmount(0.0000598, "USD"))).toBe(
			"$0.0000598",
		);
	});
});

describe("getRateChangeDirection", () => {
	test.each([
		[2.1, "up"],
		[-0.5, "down"],
		[0.004, "flat"],
		[-0.004, "flat"],
		[0, "flat"],
		[null, "flat"],
	] as const)("%p → %s", (change, direction) => {
		expect(getRateChangeDirection(change)).toBe(direction);
	});
});

describe("resolveRatePair", () => {
	test("defaults to the first other currency against the display currency", () => {
		expect(resolveRatePair({}, "IDR")).toEqual({ base: "USD", quote: "IDR" });
		expect(resolveRatePair({}, "USD")).toEqual({ base: "IDR", quote: "USD" });
	});

	test("keeps a valid pair from the URL", () => {
		expect(resolveRatePair({ base: "EUR", quote: "JPY" }, "IDR")).toEqual({
			base: "EUR",
			quote: "JPY",
		});
	});

	test("replaces a base equal to the quote", () => {
		expect(resolveRatePair({ base: "IDR" }, "IDR")).toEqual({
			base: "USD",
			quote: "IDR",
		});
		expect(resolveRatePair({ base: "USD", quote: "USD" }, "IDR")).toEqual({
			base: "IDR",
			quote: "USD",
		});
	});
});
