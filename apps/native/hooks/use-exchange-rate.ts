import {
	APP_SETTINGS_DEFAULTS,
	LANGUAGE_LOCALE_MAP,
	type SupportedCurrency,
	type SupportedLanguage,
} from "@finance-tracker/constants";
import type { RateChangeDirection } from "@finance-tracker/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferOutput } from "@trpc/tanstack-react-query";
import { parseISO } from "date-fns";
import {
	type LucideIcon,
	MinusIcon,
	TrendingDownIcon,
	TrendingUpIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColor } from "@/lib/theme";
import { trpc } from "@/lib/trpc";

export type RatesOverview = inferOutput<typeof trpc.exchangeRate.getOverview>;

export type PairHistory = inferOutput<typeof trpc.exchangeRate.getPairHistory>;

export type RatePair = { base: SupportedCurrency; quote: SupportedCurrency };

/** Text colour and icon of a rate change; charts take their colour from `useRateChangeColor`. */
export const RATE_CHANGE_STYLES: Record<
	RateChangeDirection,
	{ className: string; Icon: LucideIcon }
> = {
	up: { className: "text-green-600 dark:text-green-400", Icon: TrendingUpIcon },
	down: { className: "text-red-600 dark:text-red-400", Icon: TrendingDownIcon },
	flat: { className: "text-muted-foreground", Icon: MinusIcon },
};

/** Stroke colour for a rate change: green up, red down, muted when flat. */
export function useRateChangeColor() {
	const muted = useThemeColor("mutedForeground");
	return (direction: RateChangeDirection) =>
		direction === "up" ? "#22c55e" : direction === "down" ? "#ef4444" : muted;
}

/**
 * Percentages, dates, currency names and "2 hours ago" for the exchange rates screen, in the
 * app's language. Hermes lacks `Intl.DisplayNames` and `Intl.RelativeTimeFormat`, so names and
 * relative times come from the dictionaries.
 */
export function useExchangeRateText() {
	const { t } = useTranslation();
	const { data: languageSetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);
	const locale =
		LANGUAGE_LOCALE_MAP[
			(languageSetting?.value ??
				APP_SETTINGS_DEFAULTS.language) as SupportedLanguage
		];

	/** "2.14%" without a sign; the direction is shown by colour and icon. */
	function formatChange(changePercent: number) {
		return new Intl.NumberFormat(locale, {
			style: "percent",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(Math.abs(changePercent) / 100);
	}

	/** "US Dollar" */
	function currencyName(currency: SupportedCurrency) {
		return t(`exchangeRates.currencyNames.${currency}`);
	}

	/** A history `YYYY-MM-DD` day (local calendar day). */
	function formatDay(day: string, options: Intl.DateTimeFormatOptions) {
		return new Intl.DateTimeFormat(locale, options).format(parseISO(day));
	}

	/** "2 hours ago" */
	function formatRelativeTime(timestamp: number) {
		const minutes = Math.floor((Date.now() - timestamp) / 60_000);
		if (minutes < 1) return t("exchangeRates.relativeTime.justNow");
		if (minutes < 60) {
			return t("exchangeRates.relativeTime.minutes", { count: minutes });
		}
		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return t("exchangeRates.relativeTime.hours", { count: hours });
		}
		return t("exchangeRates.relativeTime.days", {
			count: Math.floor(hours / 24),
		});
	}

	return { locale, formatChange, currencyName, formatDay, formatRelativeTime };
}
