import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	CURRENCY_LOCALE_MAP,
	DEFAULT_CURRENCY,
} from "@finance-tracker/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";

export function useFormatCurrency() {
	const { data: currencySetting } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);

	const displayCurrency = (currencySetting?.value ??
		DEFAULT_CURRENCY) as SupportedCurrency;

	const { data: rates = [] } = useQuery(
		trpc.exchangeRate.getAll.queryOptions({ base: displayCurrency }),
	);

	const fetchIfStale = useMutation(
		trpc.exchangeRate.fetchIfStale.mutationOptions(),
	);

	useEffect(() => {
		fetchIfStale.mutate({ base: displayCurrency });
	}, [displayCurrency, fetchIfStale.mutate]);

	const rateMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const r of rates) {
			map.set(r.target, r.rate);
		}
		return map;
	}, [rates]);

	function format(amount: number, sourceCurrency?: SupportedCurrency): string {
		const src = sourceCurrency ?? displayCurrency;
		let converted = amount;

		if (src !== displayCurrency) {
			const rate = rateMap.get(src);
			// rateMap is base=displayCurrency → target=src, meaning 1 displayCurrency = rate src
			// so to convert src → displayCurrency: divide by rate
			if (rate) converted = amount / rate;
		}

		const locale = CURRENCY_LOCALE_MAP[displayCurrency];
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency: displayCurrency,
			maximumFractionDigits:
				displayCurrency === "IDR" || displayCurrency === "JPY" ? 0 : 2,
		}).format(converted);
	}

	return { format, displayCurrency };
}
