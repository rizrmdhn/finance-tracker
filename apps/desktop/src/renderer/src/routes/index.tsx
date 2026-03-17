import { Button } from "@finance-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownLeft,
	ArrowUpRight,
	Minus,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { globalSuccessToast } from "../../lib/toast";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const SUMMARY = {
	income: 8500000,
	expense: 3200000,
};

const RECENT_TRANSACTIONS = [
	{
		id: "1",
		type: "income" as const,
		amount: 5000000,
		note: "Gaji Bulanan",
		date: 1748736000000,
	},
	{
		id: "2",
		type: "expense" as const,
		amount: 850000,
		note: "Belanja Groceries",
		date: 1748649600000,
	},
	{
		id: "3",
		type: "expense" as const,
		amount: 200000,
		note: "Transportasi",
		date: 1748563200000,
	},
	{
		id: "4",
		type: "income" as const,
		amount: 3500000,
		note: "Freelance Project",
		date: 1748476800000,
	},
	{
		id: "5",
		type: "expense" as const,
		amount: 1200000,
		note: "Makan & Minum",
		date: 1748390400000,
	},
	{
		id: "6",
		type: "expense" as const,
		amount: 950000,
		note: "Tagihan Listrik",
		date: 1748304000000,
	},
];

function formatCurrency(amount: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatDate(timestamp: number) {
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
	}).format(new Date(timestamp));
}

function HomeComponent() {
	const monthLabel = new Intl.DateTimeFormat("id-ID", {
		month: "long",
		year: "numeric",
	}).format(new Date());

	const { income, expense } = SUMMARY;
	const balance = income - expense;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div>
				<h1 className="font-semibold text-xl">Dashboard</h1>
				<p className="text-muted-foreground text-sm">{monthLabel}</p>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<SummaryCard
					title="Saldo"
					value={balance}
					icon={<Wallet className="size-4 text-muted-foreground" />}
					highlight={balance >= 0 ? "positive" : "negative"}
				/>
				<SummaryCard
					title="Pemasukan"
					value={income}
					icon={<TrendingUp className="size-4 text-muted-foreground" />}
					highlight="positive"
				/>
				<SummaryCard
					title="Pengeluaran"
					value={expense}
					icon={<TrendingDown className="size-4 text-muted-foreground" />}
					highlight="negative"
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Transaksi Terbaru</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="flex flex-col gap-px">
						{RECENT_TRANSACTIONS.map((tx) => (
							<div
								key={tx.id}
								className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
							>
								<div
									className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
										tx.type === "income"
											? "bg-green-500/10 text-green-600"
											: "bg-red-500/10 text-red-500"
									}`}
								>
									{tx.type === "income" ? (
										<ArrowDownLeft className="size-4" />
									) : (
										<ArrowUpRight className="size-4" />
									)}
								</div>
								<div className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm">
										{tx.note}
									</span>
									<span className="text-muted-foreground text-xs">
										{formatDate(tx.date)}
									</span>
								</div>
								<span
									className={`font-medium text-sm tabular-nums ${
										tx.type === "income" ? "text-green-600" : "text-red-500"
									}`}
								>
									{tx.type === "income" ? (
										"+"
									) : (
										<Minus className="inline size-3" />
									)}
									{formatCurrency(tx.amount)}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Button
				variant="outline"
				className="self-start"
				onClick={() => globalSuccessToast("Fitur ini belum tersedia")}
			>
				Lihat Semua Transaksi
			</Button>
		</div>
	);
}

function SummaryCard({
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
