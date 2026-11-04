import {
	CURRENCY_LOCALE_MAP,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import type { inferOutput } from "@trpc/tanstack-react-query";
import type { trpc } from "@/lib/trpc";

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
