import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { formatCurrency } from "./utils";

export function SummaryCard({
	title,
	value,
	icon,
	highlight,
}: {
	title: string;
	value: number;
	icon: React.ReactNode;
	highlight: "positive" | "negative" | "neutral";
}) {
	const valueColor =
		highlight === "positive"
			? "text-green-600"
			: highlight === "negative"
				? "text-red-500"
				: "text-foreground";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>{title}</CardTitle>
					{icon}
				</div>
			</CardHeader>
			<CardContent>
				<p className={`font-bold text-2xl tabular-nums ${valueColor}`}>
					{formatCurrency(value)}
				</p>
			</CardContent>
		</Card>
	);
}
