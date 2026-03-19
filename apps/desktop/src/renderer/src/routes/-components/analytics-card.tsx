import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@finance-tracker/ui/components/chart";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@finance-tracker/ui/components/tabs";
import { useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Pie,
	PieChart,
	XAxis,
} from "recharts";
import {
	type Category,
	formatCurrency,
	getLast6Months,
	type Transaction,
} from "./utils";

const barChartConfig = {
	income: { label: "Pemasukan", color: "#22c55e" },
	expense: { label: "Pengeluaran", color: "#ef4444" },
} satisfies ChartConfig;

const categoryChartConfig = {
	amount: { label: "Jumlah" },
} satisfies ChartConfig;

const balanceChartConfig = {
	balance: { label: "Saldo", color: "#3b82f6" },
} satisfies ChartConfig;

function currencyFormatter(value: unknown, name: unknown) {
	return (
		<>
			<span className="text-muted-foreground">{name as string}</span>
			<span className="ml-auto font-medium font-mono tabular-nums">
				{formatCurrency(value as number)}
			</span>
		</>
	);
}

interface AnalyticsCardProps {
	transactions: Transaction[];
	categories: Category[];
}

export function AnalyticsCard({
	transactions,
	categories,
}: AnalyticsCardProps) {
	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);

	const months = useMemo(() => getLast6Months(), []);

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
				return { month: label, income, expense };
			}),
		[transactions, categoryMap, months],
	);

	const categoryData = useMemo(
		() =>
			categories
				.filter((c) => c.type === "expense")
				.map((cat) => ({
					category: cat.name,
					amount: transactions
						.filter((tx) => tx.categoryId === cat.id)
						.reduce((sum, tx) => sum + tx.amount, 0),
					fill: cat.color ?? "#94a3b8",
				}))
				.filter((item) => item.amount > 0),
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
						if (type === "expense") return sum - tx.amount;
						return sum;
					}, 0);
				return { month: label, balance };
			}),
		[transactions, categoryMap, months],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Analitik</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="monthly">
					<TabsList>
						<TabsTrigger value="monthly">Bulanan</TabsTrigger>
						<TabsTrigger value="category">Kategori</TabsTrigger>
						<TabsTrigger value="balance">Saldo</TabsTrigger>
					</TabsList>

					<TabsContent value="monthly">
						<ChartContainer
							config={barChartConfig}
							className="mt-4 aspect-auto h-62.5 w-full"
						>
							<BarChart data={monthlyData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="month" tickLine={false} axisLine={false} />
								<ChartTooltip
									content={
										<ChartTooltipContent formatter={currencyFormatter} />
									}
								/>
								<ChartLegend content={<ChartLegendContent />} />
								<Bar dataKey="income" fill="var(--color-income)" radius={4} />
								<Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
							</BarChart>
						</ChartContainer>
					</TabsContent>

					<TabsContent value="category">
						<ChartContainer
							config={categoryChartConfig}
							className="mt-4 aspect-auto h-62.5 w-full"
						>
							<PieChart>
								<Pie
									data={categoryData}
									dataKey="amount"
									nameKey="category"
									innerRadius={70}
									outerRadius={100}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											hideLabel
											formatter={currencyFormatter}
										/>
									}
								/>
								<ChartLegend
									content={<ChartLegendContent nameKey="category" />}
								/>
							</PieChart>
						</ChartContainer>
					</TabsContent>

					<TabsContent value="balance">
						<ChartContainer
							config={balanceChartConfig}
							className="mt-4 aspect-auto h-62.5 w-full"
						>
							<AreaChart data={balanceData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="month" tickLine={false} axisLine={false} />
								<ChartTooltip
									content={
										<ChartTooltipContent formatter={currencyFormatter} />
									}
								/>
								<Area
									dataKey="balance"
									fill="var(--color-balance)"
									stroke="var(--color-balance)"
									fillOpacity={0.15}
								/>
							</AreaChart>
						</ChartContainer>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
