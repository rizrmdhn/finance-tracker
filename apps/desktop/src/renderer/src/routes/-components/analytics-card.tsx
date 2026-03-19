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
import { formatCurrency } from "./utils";

const MONTHLY_DATA = [
	{ month: "Okt", income: 8500000, expense: 3200000 },
	{ month: "Nov", income: 7200000, expense: 4100000 },
	{ month: "Des", income: 9000000, expense: 5600000 },
	{ month: "Jan", income: 8500000, expense: 3800000 },
	{ month: "Feb", income: 7800000, expense: 2900000 },
	{ month: "Mar", income: 8500000, expense: 3200000 },
];

const CATEGORY_DATA = [
	{ category: "Groceries", amount: 850000, fill: "#22c55e" },
	{ category: "Transportasi", amount: 200000, fill: "#3b82f6" },
	{ category: "Makan & Minum", amount: 1200000, fill: "#f59e0b" },
	{ category: "Tagihan", amount: 950000, fill: "#ef4444" },
];

const BALANCE_DATA = [
	{ month: "Okt", balance: 5300000 },
	{ month: "Nov", balance: 8400000 },
	{ month: "Des", balance: 11800000 },
	{ month: "Jan", balance: 16500000 },
	{ month: "Feb", balance: 21400000 },
	{ month: "Mar", balance: 26700000 },
];

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

export function AnalyticsCard() {
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
							<BarChart data={MONTHLY_DATA}>
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
									data={CATEGORY_DATA}
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
							<AreaChart data={BALANCE_DATA}>
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
