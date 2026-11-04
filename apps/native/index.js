const { registerWidgetTaskHandler } = require("react-native-android-widget");
const {
	budgetWidgetTaskHandler,
} = require("./widgets/BudgetWidgetTaskHandler");
const { goalWidgetTaskHandler } = require("./widgets/GoalWidgetTaskHandler");

// One headless handler for every widget; route by the widget's name
registerWidgetTaskHandler((props) =>
	props.widgetInfo.widgetName === "GoalWidget"
		? goalWidgetTaskHandler(props)
		: budgetWidgetTaskHandler(props),
);

require("expo-router/entry");
