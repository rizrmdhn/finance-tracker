import type { Category, Transaction } from "@finance-tracker/types";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import {
	Area,
	Bar,
	CartesianChart,
	Line,
	Pie,
	PolarChart,
} from "victory-native";
import { useThemeColor } from "@/lib/theme";
import { cn, formatCurrency, getMonthsInRange } from "@/lib/utils";
import { Text } from "./ui/text";

const CHART_HEIGHT = 220;

type Tab = "monthly" | "category" | "balance";

interface AnalyticsCardProps {
	transactions: Transaction[];
	categories: Category[];
	from: number;
	to: number;
}

export function AnalyticsCard({
	transactions,
	categories,
	from,
	to,
}: AnalyticsCardProps) {
	const { t } = useTranslation();

	const [activeTab, setActiveTab] = useState<Tab>("monthly");
	const [chartWidth, setChartWidth] = useState(0);

	const mutedColor = useThemeColor("muted");
	const borderColor = useThemeColor("border");

	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);

	const months = useMemo(() => getMonthsInRange(from, to), [from, to]);

	const monthlyData = useMemo(
		() =>
			months.map(({ label, from, to }) => {
				const monthTxs = transactions.filter(
					(tx) => tx.date >= from && tx.date <= to,
				);
				const income = monthTxs
					.filter(
						(tx) => categoryMap.get(tx.categoryId ?? "")?.type === "income",
					)
					.reduce((sum, tx) => sum + tx.amount, 0);
				const expense = monthTxs
					.filter(
						(tx) => categoryMap.get(tx.categoryId ?? "")?.type === "expense",
					)
					.reduce((sum, tx) => sum + tx.amount, 0);
				const savings = monthTxs
					.filter(
						(tx) => categoryMap.get(tx.categoryId ?? "")?.type === "savings",
					)
					.reduce((sum, tx) => sum + tx.amount, 0);
				return { month: label, income, expense, savings };
			}),
		[transactions, categoryMap, months],
	);

	const categoryData = useMemo(
		() =>
			categories
				.filter((c) => c.type === "expense" || c.type === "savings")
				.map((cat) => ({
					label: cat.name,
					value: transactions
						.filter((tx) => tx.categoryId === cat.id)
						.reduce((sum, tx) => sum + tx.amount, 0),
					color: cat.color ?? "#94a3b8",
				}))
				.filter((item) => item.value > 0),
		[transactions, categories],
	);

	const balanceData = useMemo(
		() =>
			months.map(({ label, from, to }) => {
				const balance = transactions
					.filter((tx) => tx.date >= from && tx.date <= to)
					.reduce((sum, tx) => {
						const type = categoryMap.get(tx.categoryId ?? "")?.type;
						if (type === "income") return sum + tx.amount;
						if (type === "expense" || type === "savings")
							return sum - tx.amount;
						return sum;
					}, 0);
				return { month: label, balance };
			}),
		[transactions, categoryMap, months],
	);

	const formatYLabel = (v: number) => {
		if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
		if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
		return String(v);
	};

	const tabs: { key: Tab; label: string }[] = [
		{ key: "monthly", label: t("analitics.incomeAndExpense") },
		{ key: "category", label: t("analitics.byCategory") },
		{ key: "balance", label: t("analitics.balanceOverTime") },
	];

	const axisOptions = {
		labelColor: mutedColor,
		lineColor: borderColor,
		tickCount: { y: 4 },
		formatYLabel,
	};

	return (
		<View
			className="rounded-xl border border-border bg-card p-4"
			onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 32)}
		>
			<Text className="mb-3 font-semibold text-base text-foreground">
				{t("analitics.title")}
			</Text>

			{/* Tabs */}
			<View className="mb-4 flex-row flex-wrap gap-2">
				{tabs.map(({ key, label }) => (
					<TouchableOpacity
						key={key}
						onPress={() => setActiveTab(key)}
						className={cn(
							"rounded-lg border px-3 py-1.5",
							activeTab === key
								? "border-foreground bg-foreground"
								: "border-border bg-transparent",
						)}
					>
						<Text
							className={cn(
								"font-medium text-xs",
								activeTab === key ? "text-background" : "text-muted-foreground",
							)}
						>
							{label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Bar Chart - Monthly Income & Expense */}
			{activeTab === "monthly" && (
				<View>
					<View style={{ height: CHART_HEIGHT, width: chartWidth }}>
						<CartesianChart
							data={monthlyData}
							xKey="month"
							yKeys={["income", "expense", "savings"]}
							domainPadding={{ left: 20, right: 20 }}
							axisOptions={{
								...axisOptions,
								tickCount: { x: monthlyData.length, y: 4 },
							}}
						>
							{({ points, chartBounds }) => (
								<>
									<Bar
										points={points.income}
										chartBounds={chartBounds}
										color="#22c55e"
										roundedCorners={{ topLeft: 4, topRight: 4 }}
									/>
									<Bar
										points={points.expense}
										chartBounds={chartBounds}
										color="#ef4444"
										roundedCorners={{ topLeft: 4, topRight: 4 }}
									/>
									<Bar
										points={points.savings}
										chartBounds={chartBounds}
										color="#a855f7"
										roundedCorners={{ topLeft: 4, topRight: 4 }}
									/>
								</>
							)}
						</CartesianChart>
					</View>
					<View className="mt-2 flex-row justify-center gap-4">
						{[
							{ color: "#22c55e", label: "Pemasukan" },
							{ color: "#ef4444", label: "Pengeluaran" },
							{ color: "#a855f7", label: "Tabungan" },
						].map(({ color, label }) => (
							<View key={label} className="flex-row items-center gap-1">
								<View
									className="size-2.5 rounded-sm"
									style={{ backgroundColor: color }}
								/>
								<Text className="text-muted-foreground text-xs">{label}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Pie Chart - Category Distribution */}
			{activeTab === "category" &&
				(categoryData.length === 0 ? (
					<View
						className="items-center justify-center"
						style={{ height: CHART_HEIGHT }}
					>
						<Text className="text-muted-foreground text-sm">
							Tidak ada data kategori
						</Text>
					</View>
				) : (
					<View>
						<PolarChart
							data={categoryData}
							labelKey="label"
							valueKey="value"
							colorKey="color"
							canvasStyle={{ height: CHART_HEIGHT, width: chartWidth }}
						>
							<Pie.Chart innerRadius="60%" />
						</PolarChart>
						<View className="mt-2 gap-1.5">
							{categoryData.map(({ label, value, color }) => (
								<View key={label} className="flex-row items-center gap-2">
									<View
										className="size-2.5 rounded-full"
										style={{ backgroundColor: color }}
									/>
									<Text className="flex-1 text-muted-foreground text-xs">
										{label}
									</Text>
									<Text className="font-medium text-foreground text-xs">
										{formatCurrency(value)}
									</Text>
								</View>
							))}
						</View>
					</View>
				))}

			{/* Area Chart - Balance History */}
			{activeTab === "balance" && (
				<View style={{ height: CHART_HEIGHT, width: chartWidth }}>
					<CartesianChart
						data={balanceData}
						xKey="month"
						yKeys={["balance"]}
						domainPadding={{ left: 10, right: 10, top: 20 }}
						axisOptions={{
							...axisOptions,
							tickCount: { x: balanceData.length, y: 4 },
						}}
					>
						{({ points, chartBounds }) => (
							<>
								<Area
									points={points.balance}
									y0={chartBounds.bottom}
									color="#3b82f6"
									opacity={0.15}
								/>
								<Line points={points.balance} color="#3b82f6" strokeWidth={2} />
							</>
						)}
					</CartesianChart>
				</View>
			)}
		</View>
	);
}
