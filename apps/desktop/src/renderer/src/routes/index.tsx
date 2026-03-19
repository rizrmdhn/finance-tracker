import { Button } from "@finance-tracker/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { globalSuccessToast } from "../../lib/toast";
import { AnalyticsCard } from "./-components/analytics-card";
import { RecentTransactions } from "./-components/recent-transactions";
import { SummaryCard } from "./-components/summary-card";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const SUMMARY = {
	income: 8500000,
	expense: 3200000,
};

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

			<AnalyticsCard />

			<RecentTransactions />

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
