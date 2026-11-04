import { describe, expect, test } from "bun:test";
import { createCurrencyConverter } from "./currency";
import {
	getDefaultGoalPayments,
	getGoalAccountOptions,
	getGoalAllocationDefaults,
	getGoalContributionOptions,
	getGoalPaymentRemaining,
} from "./goal";

const account = (id: string, deletedAt: string | null = null) => ({
	id,
	deletedAt,
});
const allocation = (
	accountId: string,
	overrides: Partial<{
		allocated: number;
		freeBalance: number;
		isLinked: boolean;
		linkedGoalId: string | null;
	}> = {},
) => ({
	accountId,
	allocated: 0,
	freeBalance: 100,
	isLinked: false,
	linkedGoalId: null,
	...overrides,
});

describe("getGoalAccountOptions", () => {
	test("skips deleted accounts; accounts without allocation data are free", () => {
		expect(
			getGoalAccountOptions([account("a"), account("b", "2026-01-01")], []),
		).toEqual([
			{ account: account("a"), freeBalance: 0, isLinked: false, canLink: true },
		]);
	});

	test("rule 1: linked elsewhere or a contribution source can't be linked", () => {
		const options = getGoalAccountOptions(
			[account("linked"), account("source"), account("own"), account("free")],
			[
				allocation("linked", {
					isLinked: true,
					linkedGoalId: "other",
					freeBalance: 0,
				}),
				allocation("source", { allocated: 50, freeBalance: 50 }),
				allocation("own", {
					isLinked: true,
					linkedGoalId: "goal",
					freeBalance: 0,
				}),
				allocation("free"),
			],
			"goal",
		);
		expect(options.map((o) => [o.account.id, o.canLink, o.isLinked])).toEqual([
			["linked", false, true],
			["source", false, false],
			["own", true, true],
			["free", true, false],
		]);
		expect(options.map((o) => o.freeBalance)).toEqual([0, 50, 0, 100]);
	});
});

describe("getGoalAllocationDefaults", () => {
	const goals = [
		{ id: "a", status: "active", allocationPercent: 30, priority: 0 },
		{ id: "b", status: "active", allocationPercent: 50, priority: 2 },
		{ id: "c", status: "purchased", allocationPercent: 100, priority: 5 },
	] as const;

	test("no goals: everything is free and the first priority is 0", () => {
		expect(getGoalAllocationDefaults([])).toEqual({
			availablePercent: 100,
			nextPriority: 0,
		});
	});

	test("only other active goals count", () => {
		expect(getGoalAllocationDefaults([...goals])).toEqual({
			availablePercent: 20,
			nextPriority: 3,
		});
		expect(getGoalAllocationDefaults([...goals], "b")).toEqual({
			availablePercent: 70,
			nextPriority: 1,
		});
	});

	test("never below 0", () => {
		expect(
			getGoalAllocationDefaults([
				{ id: "a", status: "active", allocationPercent: 120, priority: 0 },
			]).availablePercent,
		).toBe(0);
	});
});

describe("getGoalContributionOptions", () => {
	const accounts = [account("a"), account("b"), account("c")];
	const accountOptions = [
		{ account: accounts[0], freeBalance: 100, isLinked: false },
		{ account: accounts[1], freeBalance: 0, isLinked: true },
		{ account: accounts[2], freeBalance: 0, isLinked: false },
	];
	const contributions = [
		{ accountId: "a", held: 40 },
		{ accountId: "c", held: 0 },
		{ accountId: "gone", held: 10 },
	];

	test("set aside: unlinked accounts, max = free balance", () => {
		expect(
			getGoalContributionOptions("setAside", {
				accountOptions,
				accounts,
				contributions,
			}),
		).toEqual([
			{ account: accounts[0], max: 100 },
			{ account: accounts[2], max: 0 },
		]);
	});

	test("withdraw: accounts the goal holds money from, max = held", () => {
		expect(
			getGoalContributionOptions("withdraw", {
				accountOptions,
				accounts,
				contributions,
			}),
		).toEqual([{ account: accounts[0], max: 40 }]);
	});
});

describe("getDefaultGoalPayments", () => {
	test("linked balance, held amounts and the shortfall", () => {
		expect(
			getDefaultGoalPayments(
				{ linkedAccountId: "linked", targetAmount: 1000 },
				{
					total: 700,
					contributions: [
						{ accountId: "a", held: 200 },
						{ accountId: "b", held: 0 },
					],
				},
				500,
			),
		).toEqual([
			{ accountId: "linked", amount: 500, source: "linked" },
			{ accountId: "a", amount: 200, source: "setAside" },
			{ amount: 300, source: "shortfall" },
		]);
	});

	test("reached: no shortfall row", () => {
		expect(
			getDefaultGoalPayments(
				{ linkedAccountId: null, targetAmount: 100 },
				{ total: 150, contributions: [{ accountId: "a", held: 150 }] },
				0,
			),
		).toEqual([{ accountId: "a", amount: 150, source: "setAside" }]);
	});

	test("nothing held and reached: one empty row", () => {
		expect(
			getDefaultGoalPayments(
				{ linkedAccountId: "linked", targetAmount: 0 },
				{ total: 0, contributions: [] },
				0,
			),
		).toEqual([{ amount: undefined, source: "shortfall" }]);
	});
});

describe("getGoalPaymentRemaining", () => {
	test("target minus the other payments, never below 0", () => {
		expect(getGoalPaymentRemaining(1000, [300, 999, 200], 1)).toBe(500);
		expect(getGoalPaymentRemaining(100, [300, 50], 1)).toBe(0);
	});
});

describe("createCurrencyConverter", () => {
	// 1 IDR = 0.00006 USD
	const converter = createCurrencyConverter("IDR", [
		{ target: "USD", rate: 0.00006 },
	]);

	test("same currency is unchanged", () => {
		expect(converter.toBase(500, "IDR")).toBe(500);
		expect(converter.fromBase(500, "IDR")).toBe(500);
	});

	test("converts with the rate; fromBase rounds to cents", () => {
		expect(converter.toBase(6, "USD")).toBeCloseTo(100_000);
		expect(converter.fromBase(123_456, "USD")).toBe(7.41);
	});

	test("missing rate: toBase passes through, fromBase is null", () => {
		const noRates = createCurrencyConverter("IDR", []);
		expect(noRates.toBase(6, "USD")).toBe(6);
		expect(noRates.fromBase(6, "USD")).toBeNull();
	});
});
