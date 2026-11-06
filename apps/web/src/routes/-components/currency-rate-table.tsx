import {
	CURRENCY_SYMBOLS,
	type ExchangeRateRange,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@finance-tracker/ui/components/table";
import { cn } from "@finance-tracker/ui/lib/utils";
import { formatRate, getRateChangeDirection } from "@finance-tracker/utils";
import { useTranslation } from "react-i18next";
import {
	RATE_CHANGE_STYLES,
	type RatePair,
	type RatesOverview,
	useExchangeRateText,
} from "./exchange-rate-utils";
import { RateChange } from "./rate-change";

const TREND_CELL_CLASS = "hidden w-28 sm:table-cell";

interface CurrencyRateTableProps {
	overview: RatesOverview;
	displayCurrency: SupportedCurrency;
	range: ExchangeRateRange;
	pair: RatePair;
	onSelect: (currency: SupportedCurrency) => void;
	className?: string;
}

/** Every other currency against the display currency; a row click charts that currency. */
export function CurrencyRateTable({
	overview,
	displayCurrency,
	range,
	pair,
	onSelect,
	className,
}: CurrencyRateTableProps) {
	const { t } = useTranslation();
	const { currencyName } = useExchangeRateText();

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>
					{t("exchangeRates.table.title", { currency: displayCurrency })}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("exchangeRates.table.currency")}</TableHead>
							<TableHead className="text-right">
								{t("exchangeRates.table.rate")}
							</TableHead>
							<TableHead className="text-right">
								{t("exchangeRates.table.change", {
									range: t(`exchangeRates.ranges.${range}`),
								})}
							</TableHead>
							<TableHead className={TREND_CELL_CLASS}>
								{t("exchangeRates.table.trend")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{overview.currencies.map((item) => {
							const selected =
								pair.base === item.currency && pair.quote === displayCurrency;
							return (
								<TableRow
									key={item.currency}
									data-state={selected ? "selected" : undefined}
									aria-selected={selected}
									tabIndex={0}
									className="cursor-pointer"
									onClick={() => onSelect(item.currency)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onSelect(item.currency);
										}
									}}
								>
									<TableCell>
										<div className="flex items-center gap-3">
											<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-xs">
												{CURRENCY_SYMBOLS[item.currency]}
											</span>
											<div className="min-w-0">
												<div className="font-medium">{item.currency}</div>
												<div className="truncate text-muted-foreground">
													{currencyName(item.currency)}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium tabular-nums">
										{item.rate === null
											? "—"
											: formatRate(item.rate, displayCurrency)}
									</TableCell>
									<TableCell className="text-right">
										<RateChange changePercent={item.changePercent} />
									</TableCell>
									<TableCell className={TREND_CELL_CLASS}>
										<Sparkline
											points={item.sparkline}
											className={
												RATE_CHANGE_STYLES[
													getRateChangeDirection(item.changePercent)
												].className
											}
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

const SPARKLINE_WIDTH = 96;
const SPARKLINE_HEIGHT = 28;
const SPARKLINE_PADDING = 2;

/** A tiny line of the rate over the range, in `currentColor`. */
function Sparkline({
	points,
	className,
}: {
	points: number[];
	className?: string;
}) {
	if (points.length < 2) {
		return <span className="text-muted-foreground">—</span>;
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
		<svg
			viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
			preserveAspectRatio="none"
			className={cn("h-7 w-24", className)}
			aria-hidden="true"
		>
			<polyline
				points={coordinates}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

export function CurrencyRateTableSkeleton({
	className,
}: {
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-48" />
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{[...Array(7)].map((_, i) => (
					<div key={i} className="flex items-center gap-3">
						<Skeleton className="size-8 shrink-0 rounded-full" />
						<div className="flex flex-1 flex-col gap-1.5">
							<Skeleton className="h-3 w-12" />
							<Skeleton className="h-3 w-28" />
						</div>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="hidden h-7 w-24 sm:block" />
					</div>
				))}
			</CardContent>
		</Card>
	);
}
