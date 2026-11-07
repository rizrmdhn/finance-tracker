import { describe, expect, test } from "bun:test";
import {
	formatAmountInput,
	getAmountDecimalSeparator,
	parseAmountInput,
} from "./amount-input";

describe("parseAmountInput", () => {
	test.each([
		["1234567", "IDR", "1.234.567", 1234567],
		["1.234.5678", "IDR", "12.345.678", 12345678],
		["007", "IDR", "7", 7],
		["0", "IDR", "0", 0],
		["12,5", "IDR", "125", 125],
		["1234567", "JPY", "1,234,567", 1234567],
		["1234.5", "USD", "1,234.5", 1234.5],
		["1,234.", "USD", "1,234.", 1234],
		["1,234.567", "USD", "1,234.56", 1234.56],
		["1.2.3", "USD", "1.23", 1.23],
		[".5", "USD", "0.5", 0.5],
		["1.234,5", "EUR", "1.234,5", 1234.5],
		["12345,67", "EUR", "12.345,67", 12345.67],
		["1234.5", "MYR", "1,234.5", 1234.5],
		["1,234,", "USD", "1,234.", 1234],
		["1.234.", "EUR", "1.234,", 1234],
		["1.234.", "IDR", "1.234", 1234],
	] as const)("%s %s → %s", (text, currency, display, value) => {
		expect(parseAmountInput(text, currency)).toEqual({ display, value });
	});

	test("empty or digit-free text clears the value", () => {
		expect(parseAmountInput("", "IDR")).toEqual({
			display: "",
			value: undefined,
		});
		expect(parseAmountInput("abc", "USD")).toEqual({
			display: "",
			value: undefined,
		});
	});
});

describe("formatAmountInput", () => {
	test("drops a trailing decimal separator and keeps up to two decimals", () => {
		expect(formatAmountInput(1234, "USD")).toBe("1,234");
		expect(formatAmountInput(1234.5, "EUR")).toBe("1.234,5");
		expect(formatAmountInput(1234567, "IDR")).toBe("1.234.567");
		expect(formatAmountInput(undefined, "IDR")).toBe("");
	});
});

describe("getAmountDecimalSeparator", () => {
	test("follows the currency's locale and is null for whole-number currencies", () => {
		expect(getAmountDecimalSeparator("USD")).toBe(".");
		expect(getAmountDecimalSeparator("EUR")).toBe(",");
		expect(getAmountDecimalSeparator("IDR")).toBeNull();
	});
});
