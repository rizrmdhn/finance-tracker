import type { SupportedCurrency } from "@finance-tracker/constants";
import type { DurationParts } from "@finance-tracker/utils";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "widget-data" });

export type WidgetBudget = {
	id: string;
	amount: number;
	spent: number;
	remaining: number;
	isOverBudget: boolean;
	period: "monthly" | "weekly";
	/** Amounts are in the budget's own currency. */
	currency: SupportedCurrency;
	category: {
		name: string;
		color: string;
	} | null;
};

export type WidgetData = {
	budgets: WidgetBudget[];
	language: string;
	lastUpdated: number;
};

export function saveWidgetData(data: Omit<WidgetData, "lastUpdated">) {
	storage.set(
		"widget-data",
		JSON.stringify({ ...data, lastUpdated: Date.now() }),
	);
}

export function getWidgetData(): WidgetData | null {
	const raw = storage.getString("widget-data");
	if (!raw) return null;
	try {
		return JSON.parse(raw) as WidgetData;
	} catch {
		return null;
	}
}

export type WidgetGoal = {
	id: string;
	name: string;
	color: string;
	/** Progress and target in the goal's currency. */
	total: number;
	targetAmount: number;
	currency: SupportedCurrency;
	isReached: boolean;
	/** Time left until the estimate; null when it can't be estimated. */
	timeLeft: DurationParts | null;
};

export type GoalWidgetData = {
	goals: WidgetGoal[];
	language: string;
	lastUpdated: number;
};

export function saveGoalWidgetData(data: Omit<GoalWidgetData, "lastUpdated">) {
	storage.set(
		"goal-widget-data",
		JSON.stringify({ ...data, lastUpdated: Date.now() }),
	);
}

export function getGoalWidgetData(): GoalWidgetData | null {
	const raw = storage.getString("goal-widget-data");
	if (!raw) return null;
	try {
		return JSON.parse(raw) as GoalWidgetData;
	} catch {
		return null;
	}
}
