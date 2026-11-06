"use no memo";

import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import { getAppSettingByKey, getGoalsOverview } from "@finance-tracker/queries";
import {
	requestWidgetUpdate,
	type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { db } from "../lib/db";
import { getGoalWidgetData, saveGoalWidgetData } from "../lib/widget-storage";
import { GoalWidget, toWidgetGoals } from "./GoalWidget";

async function fetchAndSaveWidgetData() {
	const [overview, langSetting] = await Promise.all([
		getGoalsOverview(db),
		getAppSettingByKey(db, "language"),
	]);

	saveGoalWidgetData({
		goals: toWidgetGoals(overview),
		language: langSetting?.value ?? APP_SETTINGS_DEFAULTS.language,
	});
}

/** Re-reads the database and redraws every goal widget on the home screen. */
export async function updateGoalWidgets() {
	await fetchAndSaveWidgetData();
	const data = getGoalWidgetData();
	await requestWidgetUpdate({
		widgetName: "GoalWidget",
		renderWidget: ({ height }) => <GoalWidget data={data} height={height} />,
	});
}

export async function goalWidgetTaskHandler(props: WidgetTaskHandlerProps) {
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
		<GoalWidget data={getGoalWidgetData()} height={props.widgetInfo.height} />,
	);
}
