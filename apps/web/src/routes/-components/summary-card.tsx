import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { cn } from "@finance-tracker/ui/lib/utils";
import { useFormatCurrency } from "@/hooks/use-format-currency";

export function SummaryCard({
	title,
	value,
	icon,
	highlight,
	sourceCurrency,
	className,
}: {
	className?: string;
	title: string;
	value: number;
	icon: React.ReactNode;
	highlight: "positive" | "negative" | "neutral";
	sourceCurrency?: SupportedCurrency;
}) {
	const { format } = useFormatCurrency();
	const valueColor =
		highlight === "positive"
			? "text-green-600"
			: highlight === "negative"
				? "text-red-500"
				: "text-foreground";

	const formatted = format(value, sourceCurrency);

	return (
		<Card className={cn("min-w-0", className)}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>{title}</CardTitle>
					{icon}
				</div>
			</CardHeader>
			<CardContent>
				{/* The grid keeps cards wide enough for typical amounts; truncate is the last resort */}
				<p
					className={cn("truncate font-bold text-2xl tabular-nums", valueColor)}
					title={formatted}
				>
					{formatted}
				</p>
			</CardContent>
		</Card>
	);
}
