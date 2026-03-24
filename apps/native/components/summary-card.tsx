import { Text, View } from "react-native";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
				<View className="flex-row items-center justify-between">
					<CardTitle>{title}</CardTitle>
					{icon}
				</View>
			</CardHeader>
			<CardContent>
				<Text className={`font-bold text-2xl tabular-nums ${valueColor}`}>
					{formatCurrency(value)}
				</Text>
			</CardContent>
		</Card>
	);
}
