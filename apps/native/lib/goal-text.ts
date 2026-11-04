import type { DurationParts } from "@finance-tracker/utils";
import type { TFunction } from "i18next";

/**
 * Time left until the estimate, e.g. "± 1 year 3 months left". Takes `t` so the home-screen
 * widget, which renders outside React, can use it with `i18n.getFixedT`.
 */
export function formatGoalTimeLeft(t: TFunction, parts: DurationParts) {
	const years = (count: number) => t("goals.duration.years", { count });
	const months = (count: number) => t("goals.duration.months", { count });

	switch (parts.unit) {
		case "days":
			return t("goals.estimate.daysLeft", { count: parts.days });
		case "months":
			return t("goals.estimate.monthsLeft", { count: parts.months });
		case "yearsMonths":
			return parts.months === 0
				? t("goals.estimate.yearsLeft", { count: parts.years })
				: t("goals.estimate.yearsMonthsLeft", {
						years: years(parts.years),
						months: months(parts.months),
					});
		case "overCap":
			return t("goals.estimate.overCap", { years: parts.years });
	}
}
