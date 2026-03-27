import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "widget-data" });

export type WidgetBudget = {
	id: string;
	amount: number;
	spent: number;
	remaining: number;
	isOverBudget: boolean;
	period: string;
	category: {
		name: string;
		color: string | null;
	} | null;
};

export type WidgetData = {
	budgets: WidgetBudget[];
	language: string;
	currency: string;
	currencyLocale: string;
};

export function saveWidgetData(data: WidgetData) {
	storage.set("widget-data", JSON.stringify(data));
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
