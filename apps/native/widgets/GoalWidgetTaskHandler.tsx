"use no memo";

import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import { getAppSettingByKey, getGoalsOverview } from "@finance-tracker/queries";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
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

export async function goalWidgetTaskHandler(props: WidgetTaskHandlerProps) {
	switch (props.widgetAction) {
		case "WIDGET_ADDED": {
			// Nothing may be saved yet if the goals screen was never opened
			await fetchAndSaveWidgetData();
			props.renderWidget(<GoalWidget data={getGoalWidgetData()} />);
			break;
		}
		case "WIDGET_UPDATE":
		case "WIDGET_RESIZED": {
			props.renderWidget(<GoalWidget data={getGoalWidgetData()} />);
			break;
		}
		default: {
			if ((props.widgetAction as string) === "REFRESH_WIDGET") {
				await fetchAndSaveWidgetData();
				props.renderWidget(<GoalWidget data={getGoalWidgetData()} />);
			}
			break;
		}
	}
}
