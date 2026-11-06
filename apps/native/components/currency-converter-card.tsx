import type { SupportedCurrency } from "@finance-tracker/constants";
import { formatConvertedAmount, formatRate } from "@finance-tracker/utils";
import { ArrowLeftRightIcon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import type { RatePair } from "@/hooks/use-exchange-rate";
import { CurrencyInput } from "./form/currency-input";
import { CurrencySelect } from "./form/currency-select";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Icon } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

interface CurrencyConverterCardProps {
	pair: RatePair;
	/** 1 base = rate × quote; null when there's no rate for the pair. */
	rate: number | null;
	onCurrencyChange: (side: keyof RatePair, currency: SupportedCurrency) => void;
	onSwap: () => void;
}

/** Converts an amount over the shared pair; swapping flips the chart too. */
export function CurrencyConverterCard({
	pair,
	rate,
	onCurrencyChange,
	onSwap,
}: CurrencyConverterCardProps) {
	const { t } = useTranslation();
	const [amount, setAmount] = useState<number | undefined>(1);

	return (
		<Card className="gap-4">
			<CardHeader>
				<CardTitle>{t("exchangeRates.converter.title")}</CardTitle>
			</CardHeader>
			<CardContent className="gap-4">
				<View className="gap-2">
					<Text className="font-medium text-sm">
						{t("exchangeRates.converter.amount")}
					</Text>
					<CurrencyInput
						value={amount}
						onChange={setAmount}
						currency={pair.base}
					/>
				</View>
				<View className="flex-row items-end gap-2">
					<View className="flex-1 gap-2">
						<Text className="font-medium text-sm">
							{t("exchangeRates.converter.from")}
						</Text>
						<CurrencySelect
							value={pair.base}
							onChange={(currency) => onCurrencyChange("base", currency)}
							title={t("exchangeRates.converter.from")}
						/>
					</View>
					<Button
						variant="outline"
						size="icon"
						onPress={onSwap}
						accessibilityLabel={t("exchangeRates.converter.swap")}
					>
						<Icon as={ArrowLeftRightIcon} className="size-4 text-foreground" />
					</Button>
					<View className="flex-1 gap-2">
						<Text className="font-medium text-sm">
							{t("exchangeRates.converter.to")}
						</Text>
						<CurrencySelect
							value={pair.quote}
							onChange={(currency) => onCurrencyChange("quote", currency)}
							title={t("exchangeRates.converter.to")}
						/>
					</View>
				</View>
				<View className="gap-1 rounded-lg bg-muted/50 p-3">
					{rate === null ? (
						<Text className="text-muted-foreground text-sm">
							{t("exchangeRates.converter.noRate")}
						</Text>
					) : (
						<>
							<Text className="font-semibold text-2xl tabular-nums">
								{formatConvertedAmount((amount ?? 0) * rate, pair.quote)}
							</Text>
							<Text className="text-muted-foreground text-xs tabular-nums">
								{t("exchangeRates.converter.inverse", {
									currency: pair.quote,
									rate: formatRate(1 / rate, pair.base),
								})}
							</Text>
						</>
					)}
				</View>
			</CardContent>
		</Card>
	);
}

export function CurrencyConverterCardSkeleton() {
	return (
		<Card className="gap-4">
			<CardHeader>
				<Skeleton className="h-5 w-28" />
			</CardHeader>
			<CardContent className="gap-4">
				<Skeleton className="h-10 w-full" />
				<View className="flex-row items-end gap-2">
					<Skeleton className="h-10 flex-1" />
					<Skeleton className="size-10" />
					<Skeleton className="h-10 flex-1" />
				</View>
				<Skeleton className="h-20 w-full rounded-lg" />
			</CardContent>
		</Card>
	);
}
