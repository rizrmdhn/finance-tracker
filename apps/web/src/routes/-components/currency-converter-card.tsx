import type { SupportedCurrency } from "@finance-tracker/constants";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { Label } from "@finance-tracker/ui/components/label";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { formatConvertedAmount, formatRate } from "@finance-tracker/utils";
import { ArrowLeftRightIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CurrencyInput } from "@/components/currency-input";
import { CurrencySelect } from "./currency-select";
import type { RatePair } from "./exchange-rate-utils";

interface CurrencyConverterCardProps {
	pair: RatePair;
	/** 1 base = rate × quote; null when there's no rate for the pair. */
	rate: number | null;
	onCurrencyChange: (side: keyof RatePair, currency: SupportedCurrency) => void;
	onSwap: () => void;
	className?: string;
}

/** Converts an amount over the shared pair; swapping flips the chart too. */
export function CurrencyConverterCard({
	pair,
	rate,
	onCurrencyChange,
	onSwap,
	className,
}: CurrencyConverterCardProps) {
	const { t } = useTranslation();
	const [amount, setAmount] = useState<number | undefined>(1);

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{t("exchangeRates.converter.title")}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Label>{t("exchangeRates.converter.amount")}</Label>
					<CurrencyInput
						value={amount}
						onChange={setAmount}
						currency={pair.base}
					/>
				</div>
				<div className="flex items-end gap-2">
					<div className="flex flex-1 flex-col gap-2">
						<Label>{t("exchangeRates.converter.from")}</Label>
						<CurrencySelect
							value={pair.base}
							onChange={(currency) => onCurrencyChange("base", currency)}
							label={t("exchangeRates.converter.from")}
							className="w-full"
						/>
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={onSwap}
						aria-label={t("exchangeRates.converter.swap")}
						title={t("exchangeRates.converter.swap")}
					>
						<ArrowLeftRightIcon />
					</Button>
					<div className="flex flex-1 flex-col gap-2">
						<Label>{t("exchangeRates.converter.to")}</Label>
						<CurrencySelect
							value={pair.quote}
							onChange={(currency) => onCurrencyChange("quote", currency)}
							label={t("exchangeRates.converter.to")}
							className="w-full"
						/>
					</div>
				</div>
				<div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
					{rate === null ? (
						<p className="text-muted-foreground text-sm">
							{t("exchangeRates.converter.noRate")}
						</p>
					) : (
						<>
							<p className="break-all font-semibold text-2xl tabular-nums">
								{formatConvertedAmount((amount ?? 0) * rate, pair.quote)}
							</p>
							<p className="text-muted-foreground text-xs tabular-nums">
								{t("exchangeRates.converter.inverse", {
									currency: pair.quote,
									rate: formatRate(1 / rate, pair.base),
								})}
							</p>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export function CurrencyConverterCardSkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-28" />
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Skeleton className="h-7 w-full" />
				<div className="flex items-end gap-2">
					<Skeleton className="h-7 flex-1" />
					<Skeleton className="size-7" />
					<Skeleton className="h-7 flex-1" />
				</div>
				<Skeleton className="h-20 w-full rounded-lg" />
			</CardContent>
		</Card>
	);
}
