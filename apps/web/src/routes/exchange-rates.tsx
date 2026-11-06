import {
	APP_SETTINGS_DEFAULTS,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { exchangeRatesSearchSchema } from "@finance-tracker/schema";
import { Badge } from "@finance-tracker/ui/components/badge";
import { Button } from "@finance-tracker/ui/components/button";
import { EmptyState } from "@finance-tracker/ui/components/empty-state";
import { Spinner } from "@finance-tracker/ui/components/spinner";
import { resolveRatePair } from "@finance-tracker/utils";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CoinsIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc, trpcClient } from "@/lib/trpc";
import {
	CurrencyConverterCard,
	CurrencyConverterCardSkeleton,
} from "./-components/currency-converter-card";
import {
	CurrencyRateTable,
	CurrencyRateTableSkeleton,
} from "./-components/currency-rate-table";
import {
	ExchangeRateChartCard,
	ExchangeRateChartCardSkeleton,
} from "./-components/exchange-rate-chart-card";
import {
	type RatePair,
	useExchangeRateText,
} from "./-components/exchange-rate-utils";

export const Route = createFileRoute("/exchange-rates")({
	validateSearch: exchangeRatesSearchSchema,
	component: ExchangeRatesComponent,
	head: () =>
		pageHead(
			"Exchange Rates",
			"Follow exchange rates against your display currency and convert between currencies.",
		),
});

const GRID_CLASS = "grid gap-4 lg:grid-cols-3 [&>*]:min-w-0";

// Rates feed currency conversions everywhere, goals included (see the root route)
const invalidateRates = () =>
	Promise.all([
		queryClient.invalidateQueries({ queryKey: trpc.exchangeRate.pathKey() }),
		queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() }),
	]);

function ExchangeRatesComponent() {
	const { t } = useTranslation();
	const { locale } = useExchangeRateText();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { range } = search;

	const { data: currencySetting, isSuccess: currencyLoaded } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "currency" }),
	);
	const displayCurrency = (currencySetting?.value ??
		APP_SETTINGS_DEFAULTS.currency) as SupportedCurrency;
	const pair = resolveRatePair(search, displayCurrency);

	const { data: overview } = useQuery({
		...trpc.exchangeRate.getOverview.queryOptions({ displayCurrency, range }),
		enabled: currencyLoaded,
		placeholderData: keepPreviousData,
	});

	const { data: pairHistory } = useQuery({
		...trpc.exchangeRate.getPairHistory.queryOptions({ ...pair, range }),
		enabled: currencyLoaded,
		placeholderData: keepPreviousData,
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

	useEffect(() => {
		ensureHistory({ range });
	}, [ensureHistory, range]);

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
		navigate({ search: (prev) => ({ ...prev, ...next }) });
	}

	function changeCurrency(side: keyof RatePair, currency: SupportedCurrency) {
		const other = side === "base" ? "quote" : "base";
		const next = { ...pair, [side]: currency };
		// Picking the other side's currency swaps the pair
		if (currency === pair[other]) next[other] = pair[side];
		setPair(next);
	}

	function setRange(next: ExchangeRateRange) {
		navigate({ search: (prev) => ({ ...prev, range: next }) });
	}

	const hasRates = overview?.currencies.some((c) => c.rate !== null) ?? false;
	const isLoading =
		!overview ||
		(!hasRates && (isEnsuringHistory || refreshMutation.isPending));

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-semibold text-xl">{t("exchangeRates.title")}</h1>
					<p className="max-w-2xl text-muted-foreground text-sm">
						{t("exchangeRates.description", { currency: displayCurrency })}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{overview && (
						<span className="text-muted-foreground text-sm">
							{overview.updatedAt === null
								? t("exchangeRates.notUpdated")
								: t("exchangeRates.updated", {
										time: formatRelativeTime(overview.updatedAt, locale),
									})}
						</span>
					)}
					{overview?.isStale && overview.updatedAt !== null && (
						<Badge variant="outline">{t("exchangeRates.outdated")}</Badge>
					)}
					<Button
						variant="outline"
						disabled={refreshMutation.isPending}
						onClick={() => refreshMutation.mutate()}
					>
						{refreshMutation.isPending ? <Spinner /> : <RefreshCwIcon />}
						{t("exchangeRates.refresh")}
					</Button>
				</div>
			</div>

			{isLoading && (
				<div className={GRID_CLASS}>
					<ExchangeRateChartCardSkeleton className="lg:col-span-2" />
					<CurrencyConverterCardSkeleton />
					<CurrencyRateTableSkeleton className="lg:col-span-3" />
				</div>
			)}

			{!isLoading && !hasRates && (
				<EmptyState
					className="border"
					icon={CoinsIcon}
					title={t("exchangeRates.empty.title")}
					description={t("exchangeRates.empty.description")}
					actions={[
						{
							label: t("exchangeRates.empty.retry"),
							variant: "outline",
							onClick: () => refreshMutation.mutate(),
						},
					]}
				/>
			)}

			{!isLoading && hasRates && overview && (
				<>
					{ensureHistoryFailed && (
						<p className="flex items-center gap-2 text-muted-foreground text-sm">
							<InfoIcon className="size-4 shrink-0" />
							{t("exchangeRates.historyFailed")}
						</p>
					)}
					<div className={GRID_CLASS}>
						<ExchangeRateChartCard
							className="lg:col-span-2"
							pair={pair}
							range={range}
							history={pairHistory}
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
						<CurrencyRateTable
							className="lg:col-span-3"
							overview={overview}
							displayCurrency={displayCurrency}
							range={range}
							pair={pair}
							onSelect={(currency) =>
								setPair({ base: currency, quote: displayCurrency })
							}
						/>
					</div>
				</>
			)}
		</div>
	);
}

/** "2 hours ago", in the app's language. */
function formatRelativeTime(timestamp: number, locale: string) {
	const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	const minutes = Math.floor((Date.now() - timestamp) / 60_000);
	if (minutes < 1) return format.format(0, "second");
	if (minutes < 60) return format.format(-minutes, "minute");
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return format.format(-hours, "hour");
	return format.format(-Math.floor(hours / 24), "day");
}
