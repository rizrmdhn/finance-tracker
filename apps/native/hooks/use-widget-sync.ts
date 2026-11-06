import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { updateBudgetWidgets } from "@/widgets/BudgetWidgetTaskHandler";
import { updateGoalWidgets } from "@/widgets/GoalWidgetTaskHandler";

/**
 * Redraws the home-screen widgets whenever the app goes to the background — the moment the
 * home screen shows again — so they reflect whatever changed in the app, from any screen.
 */
export function useWidgetSync() {
	useEffect(() => {
		if (Platform.OS !== "android") return;
		const subscription = AppState.addEventListener("change", (state) => {
			if (state !== "background") return;
			Promise.all([updateBudgetWidgets(), updateGoalWidgets()]).catch(
				(e: unknown) => console.error("[widgets] update failed:", e),
			);
		});
		return () => subscription.remove();
	}, []);
}
