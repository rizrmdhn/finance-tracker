import {
	APP_SETTINGS_DEFAULTS,
	CURRENCY_LOCALE_MAP,
	LANGUAGE_LOCALE_MAP,
	type SupportedCurrency,
	type SupportedLanguage,
} from "@finance-tracker/constants";
import type { DurationParts } from "@finance-tracker/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferOutput } from "@trpc/tanstack-react-query";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

export type GoalOverviewItem = inferOutput<typeof trpc.goal.overview>[number];

const NO_DECIMAL_CURRENCIES: SupportedCurrency[] = ["IDR", "JPY"];

/** Formats an amount in its own currency (e.g. a goal's), with that currency's locale. */
export function formatAmount(amount: number, currency: SupportedCurrency) {
	return new Intl.NumberFormat(CURRENCY_LOCALE_MAP[currency], {
		style: "currency",
		currency,
		maximumFractionDigits: NO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2,
	}).format(amount);
}

/** Duration and date texts for goal estimates, in the app's language. */
export function useGoalText() {
	const { t } = useTranslation();
	const { data: languageSetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);
	const locale =
		LANGUAGE_LOCALE_MAP[
			(languageSetting?.value ??
				APP_SETTINGS_DEFAULTS.language) as SupportedLanguage
		];

	const years = (count: number) => t("goals.duration.years", { count });
	const months = (count: number) => t("goals.duration.months", { count });

	/** A plain duration, e.g. "1 year 3 months" (used for the range). */
	function duration(parts: DurationParts) {
		switch (parts.unit) {
			case "days":
				return t("goals.duration.days", { count: parts.days });
			case "months":
				return months(parts.months);
			case "yearsMonths":
				return parts.months === 0
					? years(parts.years)
					: t("goals.duration.yearsMonths", {
							years: years(parts.years),
							months: months(parts.months),
						});
			case "overCap":
				return t("goals.duration.overCap", { years: parts.years });
		}
	}

	/** Time left until the estimate, e.g. "± 1 year 3 months left". */
	function timeLeft(parts: DurationParts) {
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

	/** "May 2027" */
	function formatMonth(date: Date | number) {
		return new Intl.DateTimeFormat(locale, {
			month: "long",
			year: "numeric",
		}).format(date);
	}

	/** "12 May 2027" */
	function formatDate(date: Date | number) {
		return new Intl.DateTimeFormat(locale, {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(date);
	}

	return { duration, timeLeft, formatMonth, formatDate };
}
