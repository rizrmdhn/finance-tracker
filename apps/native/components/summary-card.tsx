import type { SupportedCurrency } from "@finance-tracker/constants";
import { View } from "react-native";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Text } from "./ui/text";

export function SummaryCard({
	title,
	value,
	icon,
	highlight,
	sourceCurrency,
}: {
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

	return (
		<Card>
			<CardHeader>
				<View className="flex-row items-center justify-between">
					<CardTitle>{title}</CardTitle>
					{icon}
				</View>
			</CardHeader>
			<CardContent>
				<Text
					className={`font-bold text-2xl tabular-nums ${valueColor}`}
					numberOfLines={1}
					adjustsFontSizeToFit
				>
					{format(value, sourceCurrency)}
				</Text>
			</CardContent>
		</Card>
	);
}
