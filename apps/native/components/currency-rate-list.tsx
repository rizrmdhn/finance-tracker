import {
	CURRENCY_SYMBOLS,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { formatRate } from "@finance-tracker/utils";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import {
	type RatePair,
	type RatesOverview,
	useExchangeRateText,
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
