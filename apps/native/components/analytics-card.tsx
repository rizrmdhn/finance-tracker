import type { Category, Transaction } from "@finance-tracker/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextInput, TouchableOpacity, View } from "react-native";
import Animated, {
	useAnimatedProps,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import {
	Area,
	Bar,
	CartesianChart,
	Line,
	Pie,
	PolarChart,
	useChartPressState,
} from "victory-native";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useThemeColor } from "@/lib/theme";
import { trpc } from "@/lib/trpc";
import { cn, getMonthsInRange, getSixMonthsRange } from "@/lib/utils";
import { Text } from "./ui/text";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const CHART_HEIGHT = 220;

function formatCurrencyWorklet(amount: number) {
	"worklet";
	const rounded = Math.round(amount);
	const abs = Math.abs(rounded);
	const str = String(abs);
	let formatted = "";
	for (let i = 0; i < str.length; i++) {
		if (i > 0 && (str.length - i) % 3 === 0) formatted += ".";
		formatted += str[i];
	}
	return `${rounded < 0 ? "-" : ""}Rp\u00A0${formatted}`;
}

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
	const { format } = useFormatCurrency();

	const [activeTab, setActiveTab] = useState<Tab>("monthly");
	const [chartWidth, setChartWidth] = useState(0);

	const mutedColor = useThemeColor("mutedForeground");
	const borderColor = useThemeColor("border");
	const foregroundColor = useThemeColor("foreground");
	const cardColor = useThemeColor("card");
	const cardBorderColor = useThemeColor("border");

	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);

	const months = useMemo(() => getMonthsInRange(from, to), [from, to]);

	// Balance tab always fetches the last 6 months so it always has
	// enough data points to render a line/area chart.
	const sixMonthRange = useMemo(() => getSixMonthsRange(), []);
	const { data: balanceTransactions = [] } = useQuery(
		trpc.transaction.list.queryOptions({
			from: sixMonthRange.from,
			to: sixMonthRange.to,
		}),
	);
	const balanceMonths = useMemo(
		() => getMonthsInRange(sixMonthRange.from, sixMonthRange.to),
		[sixMonthRange],
	);

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

	// Cumulative running balance over the last 6 months.
	const balanceData = useMemo(() => {
		let running = 0;
		return balanceMonths.map(({ label, from, to }) => {
			const net = balanceTransactions
				.filter((tx) => tx.date >= from && tx.date <= to)
				.reduce((sum, tx) => {
					const type = categoryMap.get(tx.categoryId ?? "")?.type;
					if (type === "income") return sum + tx.amount;
					if (type === "expense" || type === "savings") return sum - tx.amount;
					return sum;
				}, 0);
			running += net;
			return { month: label, balance: running };
		});
	}, [balanceTransactions, categoryMap, balanceMonths]);

	const formatYLabel = (v: number) => {
		if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
		if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
		return String(v);
	};

	const axisOptions = {
		labelColor: mutedColor,
		lineColor: borderColor,
		tickCount: { y: 4 },
		formatYLabel,
	};

	// --- Press states ---
	const { state: monthlyPress, isActive: monthlyIsActive } = useChartPressState(
		{
			x: "",
			y: { income: 0, expense: 0, savings: 0 },
		},
	);
	const { state: balancePress, isActive: balanceIsActive } = useChartPressState(
		{
			x: "",
			y: { balance: 0 },
		},
	);

	// Indicator line styles (vertical line following finger)
	const monthlyIndicatorStyle = useAnimatedStyle(() => ({
		opacity: withTiming(monthlyIsActive ? 0.35 : 0, { duration: 100 }),
		transform: [{ translateX: monthlyPress.x.position.value }],
	}));
	const balanceIndicatorStyle = useAnimatedStyle(() => ({
		opacity: withTiming(balanceIsActive ? 0.35 : 0, { duration: 100 }),
		transform: [{ translateX: balancePress.x.position.value }],
	}));

	// Tooltip visibility
	const monthlyTooltipStyle = useAnimatedStyle(() => ({
		opacity: withTiming(monthlyIsActive ? 1 : 0, { duration: 150 }),
		pointerEvents: monthlyIsActive ? "none" : "none",
	}));
	const balanceTooltipStyle = useAnimatedStyle(() => ({
		opacity: withTiming(balanceIsActive ? 1 : 0, { duration: 150 }),
		pointerEvents: balanceIsActive ? "none" : "none",
	}));

	// Monthly animated text props
	const monthLabelProps = useAnimatedProps(() => ({
		text: String(monthlyPress.x.value.value),
		defaultValue: "",
	}));
	const incomeProps = useAnimatedProps(() => ({
		text: formatCurrencyWorklet(monthlyPress.y.income.value.value),
		defaultValue: formatCurrencyWorklet(0),
	}));
	const expenseProps = useAnimatedProps(() => ({
		text: formatCurrencyWorklet(monthlyPress.y.expense.value.value),
		defaultValue: formatCurrencyWorklet(0),
	}));
	const savingsProps = useAnimatedProps(() => ({
		text: formatCurrencyWorklet(monthlyPress.y.savings.value.value),
		defaultValue: formatCurrencyWorklet(0),
	}));

	// Balance animated text props
	const balanceLabelProps = useAnimatedProps(() => ({
		text: String(balancePress.x.value.value),
		defaultValue: "",
	}));
	const balanceValueProps = useAnimatedProps(() => ({
		text: formatCurrencyWorklet(balancePress.y.balance.value.value),
		defaultValue: formatCurrencyWorklet(0),
	}));

	const tabs: { key: Tab; label: string }[] = [
		{ key: "monthly", label: t("analitics.incomeAndExpense") },
		{ key: "category", label: t("analitics.byCategory") },
		{ key: "balance", label: t("analitics.balanceOverTime") },
	];

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
						{/* Vertical indicator line */}
						<Animated.View
							pointerEvents="none"
							style={[
								{
									position: "absolute",
									top: 0,
									bottom: 0,
									width: 1,
									backgroundColor: borderColor,
								},
								monthlyIndicatorStyle,
							]}
						/>
						{/* Floating tooltip */}
						<Animated.View
							pointerEvents="none"
							style={[
								{
									position: "absolute",
									top: 8,
									left: 8,
									zIndex: 10,
									backgroundColor: cardColor,
									borderRadius: 8,
									borderWidth: 1,
									borderColor: cardBorderColor,
									paddingHorizontal: 10,
									paddingVertical: 8,
									gap: 4,
									minWidth: 160,
								},
								monthlyTooltipStyle,
							]}
						>
							<AnimatedTextInput
								animatedProps={monthLabelProps}
								editable={false}
								style={{
									color: foregroundColor,
									fontSize: 11,
									fontWeight: "600",
									padding: 0,
									margin: 0,
									marginBottom: 2,
								}}
							/>
							{[
								{
									props: incomeProps,
									color: "#22c55e",
									label: t("dashboard.income"),
								},
								{
									props: expenseProps,
									color: "#ef4444",
									label: t("dashboard.expense"),
								},
								{
									props: savingsProps,
									color: "#a855f7",
									label: t("dashboard.savings"),
								},
							].map(({ props, color, label }) => (
								<View
									key={label}
									style={{
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 8,
									}}
								>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: 4,
										}}
									>
										<View
											style={{
												width: 8,
												height: 8,
												borderRadius: 2,
												backgroundColor: color,
											}}
										/>
										<Text style={{ color: mutedColor, fontSize: 11 }}>
											{label}
										</Text>
									</View>
									<AnimatedTextInput
										animatedProps={props}
										editable={false}
										style={{
											color: foregroundColor,
											fontSize: 11,
											fontWeight: "500",
											padding: 0,
											margin: 0,
											textAlign: "right",
										}}
									/>
								</View>
							))}
						</Animated.View>
						<CartesianChart
							data={monthlyData}
							xKey="month"
							yKeys={["income", "expense", "savings"]}
							domainPadding={{ left: 20, right: 20 }}
							axisOptions={{
								...axisOptions,
								tickCount: { x: monthlyData.length, y: 4 },
							}}
							chartPressState={monthlyPress}
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
							{ color: "#22c55e", label: t("dashboard.income") },
							{ color: "#ef4444", label: t("dashboard.expense") },
							{ color: "#a855f7", label: t("dashboard.savings") },
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
							{t("errors.noData")}
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
										{format(value)}
									</Text>
								</View>
							))}
						</View>
					</View>
				))}

			{/* Area Chart - Balance History */}
			{activeTab === "balance" && (
				<View>
					<View style={{ height: CHART_HEIGHT, width: chartWidth }}>
						{/* Vertical indicator line */}
						<Animated.View
							pointerEvents="none"
							style={[
								{
									position: "absolute",
									top: 0,
									bottom: 0,
									width: 1,
									backgroundColor: borderColor,
								},
								balanceIndicatorStyle,
							]}
						/>
						{/* Floating tooltip */}
						<Animated.View
							pointerEvents="none"
							style={[
								{
									position: "absolute",
									top: 8,
									left: 8,
									zIndex: 10,
									backgroundColor: cardColor,
									borderRadius: 8,
									borderWidth: 1,
									borderColor: cardBorderColor,
									paddingHorizontal: 10,
									paddingVertical: 8,
									gap: 4,
									minWidth: 140,
								},
								balanceTooltipStyle,
							]}
						>
							<AnimatedTextInput
								animatedProps={balanceLabelProps}
								editable={false}
								style={{
									color: mutedColor,
									fontSize: 11,
									padding: 0,
									margin: 0,
								}}
							/>
							<View
								style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
							>
								<View
									style={{
										width: 8,
										height: 8,
										borderRadius: 2,
										backgroundColor: "#3b82f6",
									}}
								/>
								<AnimatedTextInput
									animatedProps={balanceValueProps}
									editable={false}
									style={{
										color: foregroundColor,
										fontSize: 12,
										fontWeight: "600",
										padding: 0,
										margin: 0,
									}}
								/>
							</View>
						</Animated.View>
						<CartesianChart
							data={balanceData}
							xKey="month"
							yKeys={["balance"]}
							domainPadding={{ left: 10, right: 10, top: 20 }}
							axisOptions={{
								...axisOptions,
								tickCount: { x: balanceData.length, y: 4 },
							}}
							chartPressState={balancePress}
						>
							{({ points, chartBounds }) => (
								<>
									<Area
										points={points.balance}
										y0={chartBounds.bottom}
										color="#3b82f6"
										opacity={0.15}
									/>
									<Line
										points={points.balance}
										color="#3b82f6"
										strokeWidth={2}
									/>
								</>
							)}
						</CartesianChart>
					</View>
					<View className="mt-2 flex-row justify-center">
						<View className="flex-row items-center gap-1">
							<View
								className="size-2.5 rounded-sm"
								style={{ backgroundColor: "#3b82f6" }}
							/>
							<Text className="text-muted-foreground text-xs">
								{t("analitics.balanceOverTime")}
							</Text>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}
