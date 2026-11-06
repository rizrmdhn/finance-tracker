import {
	CURRENCY_SYMBOLS,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { formatRate, getRateChangeDirection } from "@finance-tracker/utils";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import {
	type RatePair,
	type RatesOverview,
	useExchangeRateText,
	useRateChangeColor,
} from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";
import { RateChange } from "./rate-change";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g"];

interface CurrencyRateListProps {
	overview: RatesOverview;
	displayCurrency: SupportedCurrency;
	range: ExchangeRateRange;
	pair: RatePair;
	onSelect: (currency: SupportedCurrency) => void;
}

/** Every other currency against the display currency; tapping a row charts that currency. */
export function CurrencyRateList({
	overview,
	displayCurrency,
	range,
	pair,
	onSelect,
}: CurrencyRateListProps) {
	const { t } = useTranslation();
	const { currencyName } = useExchangeRateText();
	const changeColor = useRateChangeColor();

	return (
		<Card className="gap-4">
			<CardHeader>
				<CardTitle>
					{t("exchangeRates.table.title", { currency: displayCurrency })}
				</CardTitle>
			</CardHeader>
			<CardContent className="gap-1 px-3">
				<View className="flex-row justify-between px-3 pb-1">
					<Text className="text-muted-foreground text-xs">
						{t("exchangeRates.table.currency")}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{t("exchangeRates.table.rate")} ·{" "}
						{t("exchangeRates.table.change", {
							range: t(`exchangeRates.ranges.${range}`),
						})}
					</Text>
				</View>
				{overview.currencies.map((item) => {
					const selected =
						pair.base === item.currency && pair.quote === displayCurrency;
					return (
						<Pressable
							key={item.currency}
							onPress={() => onSelect(item.currency)}
							accessibilityRole="button"
							accessibilityState={{ selected }}
							className={cn(
								"flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:bg-accent/50",
								selected && "bg-accent",
							)}
						>
							<View className="size-9 shrink-0 items-center justify-center rounded-full bg-muted">
								<Text className="font-medium text-xs">
									{CURRENCY_SYMBOLS[item.currency]}
								</Text>
							</View>
							<View className="min-w-0 flex-1">
								<Text className="font-medium text-sm">{item.currency}</Text>
								<Text
									className="text-muted-foreground text-xs"
									numberOfLines={1}
								>
									{currencyName(item.currency)}
								</Text>
							</View>
							<Sparkline
								points={item.sparkline}
								color={changeColor(getRateChangeDirection(item.changePercent))}
							/>
							<View className="items-end gap-0.5">
								<Text className="font-medium text-sm tabular-nums">
									{item.rate === null
										? "—"
										: formatRate(item.rate, displayCurrency)}
								</Text>
								<RateChange
									changePercent={item.changePercent}
									className="text-xs"
								/>
							</View>
						</Pressable>
					);
				})}
			</CardContent>
		</Card>
	);
}

const SPARKLINE_WIDTH = 56;
const SPARKLINE_HEIGHT = 24;
const SPARKLINE_PADDING = 2;

/** A tiny line of the rate over the range; nothing without at least two points. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
	if (points.length < 2) {
		return <View style={{ width: SPARKLINE_WIDTH }} />;
	}

	const min = Math.min(...points);
	const span = Math.max(...points) - min;
	const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;
	const coordinates = points
		.map((point, i) => {
			const x = (i / (points.length - 1)) * SPARKLINE_WIDTH;
			// A flat line sits in the middle
			const ratio = span === 0 ? 0.5 : (point - min) / span;
			const y = SPARKLINE_PADDING + (1 - ratio) * innerHeight;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<Svg width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT}>
			<Polyline
				points={coordinates}
				fill="none"
				stroke={color}
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</Svg>
	);
}

export function CurrencyRateListSkeleton() {
	return (
		<Card className="gap-4">
			<CardHeader>
				<Skeleton className="h-5 w-48" />
			</CardHeader>
			<CardContent className="gap-4">
				{SKELETON_KEYS.map((key) => (
					<View key={key} className="flex-row items-center gap-3">
						<Skeleton className="size-9 shrink-0 rounded-full" />
						<View className="flex-1 gap-1.5">
							<Skeleton className="h-3 w-12" />
							<Skeleton className="h-3 w-28" />
						</View>
						<Skeleton className="h-6 w-16" />
						<View className="items-end gap-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-14" />
						</View>
					</View>
				))}
			</CardContent>
		</Card>
	);
}
