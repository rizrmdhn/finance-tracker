"use no memo";

import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import {
	getAppSettingByKey,
	getBudgetsWithSpent,
} from "@finance-tracker/queries";
import {
	requestWidgetUpdate,
	type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { db } from "../lib/db";
import { getCurrentMonthRange } from "../lib/utils";
import { getWidgetData, saveWidgetData } from "../lib/widget-storage";
import { BudgetWidget, toWidgetBudgets } from "./BudgetWidget";

async function fetchAndSaveWidgetData() {
	const { from, to } = getCurrentMonthRange();
	const [budgets, langSetting] = await Promise.all([
		getBudgetsWithSpent(db, { from, to }),
		getAppSettingByKey(db, "language"),
	]);

	saveWidgetData({
		budgets: toWidgetBudgets(budgets),
		language: langSetting?.value ?? APP_SETTINGS_DEFAULTS.language,
	});
}

/** Re-reads the database and redraws every budget widget on the home screen. */
export async function updateBudgetWidgets() {
	await fetchAndSaveWidgetData();
	const data = getWidgetData();
	await requestWidgetUpdate({
		widgetName: "BudgetWidget",
		renderWidget: ({ height }) => <BudgetWidget data={data} height={height} />,
	});
}

export async function budgetWidgetTaskHandler(props: WidgetTaskHandlerProps) {
	switch (props.widgetAction) {
		case "WIDGET_ADDED":
		case "WIDGET_UPDATE":
		case "WIDGET_RESIZED":
			await fetchAndSaveWidgetData();
			break;
		case "WIDGET_CLICK":
			if (props.clickAction !== "REFRESH_WIDGET") return;
			await fetchAndSaveWidgetData();
			break;
		default:
			return;
	}
	props.renderWidget(
		<BudgetWidget data={getWidgetData()} height={props.widgetInfo.height} />,
	);
}
