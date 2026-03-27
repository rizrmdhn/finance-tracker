"use no memo";

import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { getWidgetData } from "../lib/widget-storage";
import { BudgetWidget } from "./BudgetWidget";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
	switch (props.widgetAction) {
		case "WIDGET_ADDED":
		case "WIDGET_UPDATE":
		case "WIDGET_RESIZED": {
			const data = getWidgetData();
			props.renderWidget(<BudgetWidget data={data} />);
			break;
		}
		default:
			break;
	}
}
