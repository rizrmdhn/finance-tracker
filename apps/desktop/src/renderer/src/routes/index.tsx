import { Button } from "@finance-tracker/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { globalSuccessToast } from "../../lib/toast";
import { trpc } from "../../lib/trpc";
import { AnalyticsCard } from "./-components/analytics-card";
import { RecentTransactions } from "./-components/recent-transactions";
import { SummaryCard } from "./-components/summary-card";
import { getCurrentMonthRange, getSixMonthsRange } from "./-components/utils";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const { from: currentFrom, to: currentTo } = getCurrentMonthRange();
const { from: sixMonthsFrom } = getSixMonthsRange();

function HomeComponent() {
	const monthLabel = new Intl.DateTimeFormat("id-ID", {
		month: "long",
		year: "numeric",
	}).format(new Date());

	const { data: summary } = useQuery(
		trpc.transaction.summary.queryOptions({ from: currentFrom, to: currentTo }),
	);

	const { data: transactions = [] } = useQuery(
		trpc.transaction.list.queryOptions({ from: sixMonthsFrom, to: currentTo }),
	);

	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const income = summary?.income ?? 0;
	const expense = summary?.expense ?? 0;
	const balance = summary?.balance ?? 0;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">Finance Tracker</h1>
					<p className="text-muted-foreground text-sm">{monthLabel}</p>
				</div>
				<Button>Tambah Transaksi</Button>
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

			<AnalyticsCard transactions={transactions} categories={categories} />

			<RecentTransactions transactions={transactions} categories={categories} />

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
