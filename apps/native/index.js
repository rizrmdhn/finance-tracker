const { registerWidgetTaskHandler } = require("react-native-android-widget");
const { widgetTaskHandler } = require("./widgets/BudgetWidgetTaskHandler");

registerWidgetTaskHandler(widgetTaskHandler);

require("expo-router/entry");
