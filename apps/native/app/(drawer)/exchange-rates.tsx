import {
	APP_SETTINGS_DEFAULTS,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { exchangeRatesSearchSchema } from "@finance-tracker/schema";
import { resolveRatePair } from "@finance-tracker/utils";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { CoinsIcon, InfoIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Container } from "@/components/container";
import {
	CurrencyConverterCard,
	CurrencyConverterCardSkeleton,
} from "@/components/currency-converter-card";
import {
	CurrencyRateList,
	CurrencyRateListSkeleton,
} from "@/components/currency-rate-list";
import {
	ExchangeRateChartCard,
	ExchangeRateChartCardSkeleton,
} from "@/components/exchange-rate-chart-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { type RatePair, useExchangeRateText } from "@/hooks/use-exchange-rate";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc, trpcClient } from "@/lib/trpc";

// Rates feed currency conversions everywhere, goals included (see the root layout)
const invalidateRates = () =>
	Promise.all([
		queryClient.invalidateQueries({ queryKey: trpc.exchangeRate.pathKey() }),
		queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() }),
	]);

export default function ExchangeRates() {
	const { t } = useTranslation();
	const { formatRelativeTime } = useExchangeRateText();
	// Same shape and defaults as the web page's search params; unset currencies follow the display currency
	const [selection, setSelection] = useState(() =>
		exchangeRatesSearchSchema.parse({}),
	);
	const { range } = selection;

	const { data: currencySetting, isSuccess: currencyLoaded } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);
	const displayCurrency = (currencySetting?.value ??
		APP_SETTINGS_DEFAULTS.currency) as SupportedCurrency;
	const pair = resolveRatePair(selection, displayCurrency);

	const { data: overview } = useQuery({
		...trpc.exchangeRate.getOverview.queryOptions({ displayCurrency, range }),
		enabled: currencyLoaded,
		placeholderData: keepPreviousData,
	});

	const { data: pairHistory, isPending: isPairHistoryPending } = useQuery({
		...trpc.exchangeRate.getPairHistory.queryOptions({ ...pair, range }),
		enabled: currencyLoaded,
		// Keep the old series only while the range changes; another pair's numbers would mislead
		placeholderData: (previous, previousQuery) => {
			const input = (
				previousQuery?.queryKey[1] as { input?: RatePair } | undefined
			)?.input;
			return input?.base === pair.base && input?.quote === pair.quote
				? previous
				: undefined;
		},
	});

	// Without history, derive the pair from the latest rates (1 currency = rate × display)
	const rateInDisplay = (currency: SupportedCurrency) =>
		currency === displayCurrency
			? 1
			: overview?.currencies.find((c) => c.currency === currency)?.rate;
	const baseRate = rateInDisplay(pair.base);
	const quoteRate = rateInDisplay(pair.quote);
	const fallbackRate = baseRate && quoteRate ? baseRate / quoteRate : null;

	// Fill the range's missing history; on failure the cached rates stay on screen
	const {
		mutate: ensureHistory,
		reset: resetEnsureHistory,
		isPending: isEnsuringHistory,
		isError: ensureHistoryFailed,
	} = useMutation(
		trpc.exchangeRate.ensureHistory.mutationOptions({
			onSuccess: (spans) => {
				if (spans.length > 0) void invalidateRates();
			},
		}),
	);

	// Drawer screens stay mounted, so check again whenever the screen comes back into view
	useFocusEffect(
		useCallback(() => {
			ensureHistory({ range });
		}, [ensureHistory, range]),
	);

	const refreshMutation = useMutation({
		mutationFn: () =>
			Promise.all([
				trpcClient.exchangeRate.fetch.mutate({ base: displayCurrency }),
				trpcClient.exchangeRate.ensureHistory.mutate({ range, force: true }),
			]),
		onSuccess: () => {
			resetEnsureHistory();
			globalSuccessToast(t("exchangeRates.toast.refreshed"));
		},
		onError: (error) => {
			globalErrorToast(
				t("exchangeRates.toast.refreshFailed", { message: error.message }),
			);
		},
		onSettled: invalidateRates,
	});

	function setPair(next: RatePair) {
		setSelection((prev) => ({ ...prev, ...next }));
	}

	function changeCurrency(side: keyof RatePair, currency: SupportedCurrency) {
		const other = side === "base" ? "quote" : "base";
		const next = { ...pair, [side]: currency };
		// Picking the other side's currency swaps the pair
		if (currency === pair[other]) next[other] = pair[side];
		setPair(next);
	}

	function setRange(next: ExchangeRateRange) {
		setSelection((prev) => ({ ...prev, range: next }));
	}

	const hasRates = overview?.currencies.some((c) => c.rate !== null) ?? false;
	const isLoading =
		!overview ||
		(!hasRates && (isEnsuringHistory || refreshMutation.isPending));

	return (
		<Container
			onRefresh={() => refreshMutation.mutate()}
			refreshing={refreshMutation.isPending}
		>
			<View className="flex flex-col gap-6 px-6 py-3">
				<View className="gap-1">
					<Text className="font-semibold text-xl">
						{t("exchangeRates.title")}
					</Text>
					<Text className="text-muted-foreground text-sm">
						{t("exchangeRates.description", { currency: displayCurrency })}
					</Text>
					{overview && (
						<View className="mt-1 flex-row flex-wrap items-center gap-2">
							<Text className="text-muted-foreground text-sm">
								{overview.updatedAt === null
									? t("exchangeRates.notUpdated")
									: t("exchangeRates.updated", {
											time: formatRelativeTime(overview.updatedAt),
										})}
							</Text>
							{overview.isStale && overview.updatedAt !== null && (
								<Badge variant="outline">
									<Text>{t("exchangeRates.outdated")}</Text>
								</Badge>
							)}
						</View>
					)}
				</View>

				{isLoading && (
					<View className="gap-4">
						<ExchangeRateChartCardSkeleton />
						<CurrencyConverterCardSkeleton />
						<CurrencyRateListSkeleton />
					</View>
				)}

				{!isLoading && !hasRates && (
					<View className="items-center gap-2 rounded-lg border border-border px-6 py-8">
						<Icon as={CoinsIcon} className="size-8 text-muted-foreground" />
						<Text className="font-medium text-base">
							{t("exchangeRates.empty.title")}
						</Text>
						<Text className="text-center text-muted-foreground text-sm">
							{t("exchangeRates.empty.description")}
						</Text>
						<Button
							variant="outline"
							className="mt-2"
							disabled={refreshMutation.isPending}
							onPress={() => refreshMutation.mutate()}
						>
							<Text>{t("exchangeRates.empty.retry")}</Text>
						</Button>
					</View>
				)}

				{!isLoading && hasRates && overview && (
					<View className="gap-4">
						{ensureHistoryFailed && (
							<View className="flex-row items-start gap-2">
								<Icon
									as={InfoIcon}
									className="mt-0.5 size-4 shrink-0 text-muted-foreground"
								/>
								<Text className="flex-1 text-muted-foreground text-sm">
									{t("exchangeRates.historyFailed")}
								</Text>
							</View>
						)}
						<ExchangeRateChartCard
							pair={pair}
							range={range}
							history={pairHistory}
							isHistoryLoading={isPairHistoryPending}
							fallbackRate={fallbackRate}
							onCurrencyChange={changeCurrency}
							onRangeChange={setRange}
						/>
						<CurrencyConverterCard
							pair={pair}
							rate={pairHistory?.latestRate ?? fallbackRate}
							onCurrencyChange={changeCurrency}
							onSwap={() => setPair({ base: pair.quote, quote: pair.base })}
						/>
						<CurrencyRateList
							overview={overview}
							displayCurrency={displayCurrency}
							range={range}
							pair={pair}
							onSelect={(currency) =>
								setPair({ base: currency, quote: displayCurrency })
							}
						/>
					</View>
				)}
			</View>
		</Container>
	);
}
