"use no memo";

import { getAppSettingByKey, getBudgetsWithSpent } from "@finance-tracker/queries";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { db } from "../lib/db";
import { getCurrentMonthRange } from "../lib/utils";
import { getWidgetData, saveWidgetData } from "../lib/widget-storage";
import { BudgetWidget } from "./BudgetWidget";

const CURRENCY_LOCALE_MAP: Record<string, string> = {
	IDR: "id-ID",
	USD: "en-US",
};

async function fetchAndSaveWidgetData() {
	const { from, to } = getCurrentMonthRange();
	const [budgets, langSetting, currencySetting] = await Promise.all([
		getBudgetsWithSpent(db, { from, to }),
		getAppSettingByKey(db, "language"),
		getAppSettingByKey(db, "currency"),
	]);

	const currency = currencySetting?.value ?? "IDR";

	saveWidgetData({
		budgets: budgets.map((b) => ({
			id: b.id,
			amount: b.amount,
			spent: b.spent,
			remaining: b.remaining,
			isOverBudget: b.isOverBudget,
			period: b.period,
			category: b.category
				? { name: b.category.name, color: b.category.color }
				: null,
		})),
		language: langSetting?.value ?? "id",
		currency,
		currencyLocale: CURRENCY_LOCALE_MAP[currency] ?? "id-ID",
	});
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
	switch (props.widgetAction) {
		case "WIDGET_ADDED":
		case "WIDGET_UPDATE":
		case "WIDGET_RESIZED": {
			const data = getWidgetData();
			props.renderWidget(<BudgetWidget data={data} />);
			break;
		}
		default: {
			if ((props.widgetAction as string) === "REFRESH_WIDGET") {
				await fetchAndSaveWidgetData();
				const fresh = getWidgetData();
				props.renderWidget(<BudgetWidget data={fresh} />);
			}
			break;
		}
	}
}
