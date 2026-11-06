import {
	EXCHANGE_RATE_RANGES,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { formatRate, getRateChangeDirection } from "@finance-tracker/utils";
import { ArrowRightIcon } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Area, CartesianChart, Line } from "victory-native";
import {
	type PairHistory,
	type RatePair,
	useExchangeRateText,
	useRateChangeColor,
} from "@/hooks/use-exchange-rate";
import { CurrencySelect } from "./form/currency-select";
import { RateChange } from "./rate-change";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Icon } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

const CHART_HEIGHT = 200;
// Skeletons at the chart's size (h-50 = 200px); `style` would override their animation
const CHART_BOX_CLASS = "h-50 w-full";

const EDGE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
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
}: ExchangeRateChartCardProps) {
	const { t } = useTranslation();
	const { formatDay } = useExchangeRateText();
	const changeColor = useRateChangeColor();
	const series = history?.series ?? [];
	const latestRate = history?.latestRate ?? fallbackRate;
	const changePercent = history?.changePercent ?? null;
	const color = changeColor(getRateChangeDirection(changePercent));

	return (
		<Card className="gap-4">
			<CardHeader className="gap-3">
				<View className="flex-row items-center gap-2">
					<View className="flex-1">
						<CurrencySelect
							value={pair.base}
							onChange={(currency) => onCurrencyChange("base", currency)}
							title={t("exchangeRates.chart.base")}
						/>
					</View>
					<Icon as={ArrowRightIcon} className="size-4 text-muted-foreground" />
					<View className="flex-1">
						<CurrencySelect
							value={pair.quote}
							onChange={(currency) => onCurrencyChange("quote", currency)}
							title={t("exchangeRates.chart.quote")}
						/>
					</View>
				</View>
				<View className="flex-row flex-wrap items-center gap-2">
					<Text className="font-semibold text-2xl tabular-nums">
						{latestRate === null ? "—" : formatRate(latestRate, pair.quote)}
					</Text>
					{changePercent !== null && (
						<Badge variant="outline" className="gap-1 px-2">
							<RateChange changePercent={changePercent} className="text-xs" />
							<Text className="text-muted-foreground text-xs">
								· {t(`exchangeRates.ranges.${range}`)}
							</Text>
						</Badge>
					)}
				</View>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					value={range}
					onValueChange={(value) => {
						const next = EXCHANGE_RATE_RANGES.find((r) => r === value);
						if (next) onRangeChange(next);
					}}
				>
					{EXCHANGE_RATE_RANGES.map((r, i) => (
						<ToggleGroupItem
							key={r}
							value={r}
							isFirst={i === 0}
							isLast={i === EXCHANGE_RATE_RANGES.length - 1}
							className="flex-1"
						>
							<Text>{t(`exchangeRates.ranges.${r}`)}</Text>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</CardHeader>
			<CardContent>
				{isHistoryLoading ? (
					<Skeleton className={CHART_BOX_CLASS} />
				) : series.length < 2 ? (
					<View
						style={{ height: CHART_HEIGHT }}
						className="items-center justify-center rounded-lg border border-border border-dashed px-4"
					>
						<Text className="text-center text-muted-foreground text-sm">
							{t("exchangeRates.chart.noHistory")}
						</Text>
					</View>
				) : (
					<View className="gap-1">
						<RateChart series={series} color={color} />
						<View className="flex-row justify-between">
							<Text className="text-muted-foreground text-xs">
								{formatDay(series[0].date, EDGE_DATE_FORMAT)}
							</Text>
							<Text className="text-muted-foreground text-xs">
								{formatDay(series[series.length - 1].date, EDGE_DATE_FORMAT)}
							</Text>
						</View>
					</View>
				)}
			</CardContent>
		</Card>
	);
}

/** Area chart of the series, its Y axis fitted to the data. */
function RateChart({
	series,
	color,
}: {
	series: PairHistory["series"];
	color: string;
}) {
	// Fitted to the data (not from 0) so day-to-day moves stay visible
	const domain = useMemo((): [number, number] => {
		const rates = series.map((p) => p.rate);
		const min = Math.min(...rates);
		const max = Math.max(...rates);
		const padding = (max - min) * 0.1 || max * 0.01;
		return [min - padding, max + padding];
	}, [series]);

	return (
		<View style={{ height: CHART_HEIGHT }}>
			<CartesianChart
				data={series}
				xKey="date"
				yKeys={["rate"]}
				domain={{ y: domain }}
			>
				{({ points, chartBounds }) => (
					<>
						<Area
							points={points.rate}
							y0={chartBounds.bottom}
							color={color}
							opacity={0.15}
							curveType="monotoneX"
						/>
						<Line
							points={points.rate}
							color={color}
							strokeWidth={2}
							curveType="monotoneX"
						/>
					</>
				)}
			</CartesianChart>
		</View>
	);
}

export function ExchangeRateChartCardSkeleton() {
	return (
		<Card className="gap-4">
			<CardHeader className="gap-3">
				<View className="flex-row items-center gap-2">
					<Skeleton className="h-10 flex-1" />
					<Skeleton className="size-4" />
					<Skeleton className="h-10 flex-1" />
				</View>
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-9 w-full" />
			</CardHeader>
			<CardContent>
				<Skeleton className={CHART_BOX_CLASS} />
			</CardContent>
		</Card>
	);
}
