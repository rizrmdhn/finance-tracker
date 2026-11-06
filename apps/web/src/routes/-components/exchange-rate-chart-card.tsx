import {
	CURRENCY_LOCALE_MAP,
	EXCHANGE_RATE_RANGES,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { Badge } from "@finance-tracker/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
} from "@finance-tracker/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@finance-tracker/ui/components/chart";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@finance-tracker/ui/components/toggle-group";
import { cn } from "@finance-tracker/ui/lib/utils";
import { formatRate, getRateChangeDirection } from "@finance-tracker/utils";
import { ArrowRightIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CurrencySelect } from "./currency-select";
import {
	type PairHistory,
	RATE_CHANGE_STYLES,
	type RatePair,
	useExchangeRateText,
} from "./exchange-rate-utils";
import { RateChange } from "./rate-change";

const CHART_CLASS = "aspect-auto h-62.5 w-full";

const TICK_FORMAT: Record<ExchangeRateRange, Intl.DateTimeFormatOptions> = {
	"1W": { weekday: "short", day: "numeric" },
	"1M": { day: "numeric", month: "short" },
	"3M": { day: "numeric", month: "short" },
	"6M": { month: "short" },
	"1Y": { month: "short", year: "2-digit" },
	"5Y": { month: "short", year: "numeric" },
};

const TOOLTIP_DATE_FORMAT: Intl.DateTimeFormatOptions = {
	weekday: "short",
	day: "numeric",
	month: "short",
	year: "numeric",
};

interface ExchangeRateChartCardProps {
	pair: RatePair;
	range: ExchangeRateRange;
	history: PairHistory | undefined;
	/** The selected pair's history is still loading. */
	isHistoryLoading: boolean;
	/** The pair's rate from the latest cached rates, when there's no history. */
	fallbackRate: number | null;
	onCurrencyChange: (side: keyof RatePair, currency: SupportedCurrency) => void;
	onRangeChange: (range: ExchangeRateRange) => void;
	className?: string;
}

/** The selected pair over the selected range. */
export function ExchangeRateChartCard({
	pair,
	range,
	history,
	isHistoryLoading,
	fallbackRate,
	onCurrencyChange,
	onRangeChange,
	className,
}: ExchangeRateChartCardProps) {
	const { t } = useTranslation();
	const { formatDay } = useExchangeRateText();
	const series = history?.series ?? [];
	const latestRate = history?.latestRate ?? fallbackRate;
	const changePercent = history?.changePercent ?? null;
	const style = RATE_CHANGE_STYLES[getRateChangeDirection(changePercent)];
	const pairLabel = `${pair.base} → ${pair.quote}`;

	const chartConfig = {
		rate: { label: pairLabel, color: style.color },
	} satisfies ChartConfig;

	// Fitted to the data (not from 0) so day-to-day moves stay visible
	const domain = useMemo(() => {
		const rates = series.map((p) => p.rate);
		const min = Math.min(...rates);
		const max = Math.max(...rates);
		const padding = (max - min) * 0.1 || max * 0.01;
		return [min - padding, max + padding];
	}, [series]);

	const axisFormat = new Intl.NumberFormat(CURRENCY_LOCALE_MAP[pair.quote], {
		notation: "compact",
		maximumSignificantDigits: 4,
	});

	return (
		<Card className={className}>
			<CardHeader className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-1.5">
						<CurrencySelect
							value={pair.base}
							onChange={(currency) => onCurrencyChange("base", currency)}
							label={t("exchangeRates.chart.base")}
						/>
						<ArrowRightIcon className="size-3.5 text-muted-foreground" />
						<CurrencySelect
							value={pair.quote}
							onChange={(currency) => onCurrencyChange("quote", currency)}
							label={t("exchangeRates.chart.quote")}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-semibold text-2xl tabular-nums">
							{latestRate === null ? "—" : formatRate(latestRate, pair.quote)}
						</span>
						{changePercent !== null && (
							<Badge variant="outline" className="h-6 px-2 text-xs">
								<RateChange changePercent={changePercent} />
								<span className="text-muted-foreground">
									· {t(`exchangeRates.ranges.${range}`)}
								</span>
							</Badge>
						)}
					</div>
				</div>
				<ToggleGroup
					variant="outline"
					size="sm"
					value={[range]}
					onValueChange={(value) => {
						const next = EXCHANGE_RATE_RANGES.find((r) => r === value[0]);
						if (next) onRangeChange(next);
					}}
				>
					{EXCHANGE_RATE_RANGES.map((r) => (
						<ToggleGroupItem key={r} value={r}>
							{t(`exchangeRates.ranges.${r}`)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</CardHeader>
			<CardContent>
				{isHistoryLoading ? (
					<Skeleton className={CHART_CLASS} />
				) : series.length < 2 ? (
					<div
						className={cn(
							CHART_CLASS,
							"flex items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm",
						)}
					>
						{t("exchangeRates.chart.noHistory")}
					</div>
				) : (
					<ChartContainer config={chartConfig} className={CHART_CLASS}>
						<AreaChart data={series}>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								minTickGap={32}
								tickFormatter={(day: string) =>
									formatDay(day, TICK_FORMAT[range])
								}
							/>
							<YAxis
								domain={domain}
								tickLine={false}
								axisLine={false}
								width={64}
								tickFormatter={(value: number) => axisFormat.format(value)}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(_, payload) => {
											const day = payload[0]?.payload?.date;
											return day ? formatDay(day, TOOLTIP_DATE_FORMAT) : null;
										}}
										formatter={(value) => (
											<>
												<span className="text-muted-foreground">
													{pairLabel}
												</span>
												<span className="ml-auto font-medium font-mono tabular-nums">
													{formatRate(value as number, pair.quote)}
												</span>
											</>
										)}
									/>
								}
							/>
							<Area
								dataKey="rate"
								type="monotone"
								baseValue="dataMin"
								fill="var(--color-rate)"
								stroke="var(--color-rate)"
								fillOpacity={0.15}
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

export function ExchangeRateChartCardSkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-7 w-40" />
					<Skeleton className="h-8 w-48" />
				</div>
				<Skeleton className="h-6 w-56" />
			</CardHeader>
			<CardContent>
				<Skeleton className={CHART_CLASS} />
			</CardContent>
		</Card>
	);
}
