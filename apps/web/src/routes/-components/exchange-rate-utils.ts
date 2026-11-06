import {
	APP_SETTINGS_DEFAULTS,
	LANGUAGE_LOCALE_MAP,
	type SupportedCurrency,
	type SupportedLanguage,
} from "@finance-tracker/constants";
import type { RateChangeDirection } from "@finance-tracker/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferOutput } from "@trpc/tanstack-react-query";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";

export type RatesOverview = inferOutput<typeof trpc.exchangeRate.getOverview>;

export type RatePair = { base: SupportedCurrency; quote: SupportedCurrency };

/** Colour and icon of a rate change; charts use `color`, text uses `className`. */
export const RATE_CHANGE_STYLES: Record<
	RateChangeDirection,
	{ className: string; color: string; Icon: typeof TrendingUpIcon }
> = {
	up: {
		className: "text-green-600 dark:text-green-400",
		color: "#22c55e",
		Icon: TrendingUpIcon,
	},
	down: {
		className: "text-red-600 dark:text-red-400",
		color: "#ef4444",
		Icon: TrendingDownIcon,
	},
	flat: {
		className: "text-muted-foreground",
		color: "var(--muted-foreground)",
		Icon: MinusIcon,
	},
};

/** Percentages, dates and currency names for the exchange rates page, in the app's language. */
export function useExchangeRateText() {
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
		return (
			new Intl.DisplayNames(locale, { type: "currency" }).of(currency) ??
			currency
		);
	}

	return { locale, formatChange, currencyName };
}
