import { Button } from "@finance-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
} from "@finance-tracker/ui/components/card";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowLeftRight,
	PiggyBank,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { AccountCombobox } from "@/components/account-combobox";
import useModalState from "@/hooks/use-modal-state";
import { trpc } from "../lib/trpc";
import { AnalyticsCard } from "./-components/analytics-card";
import CreateTransactionDialog from "./-components/create-transaction-dialog";
import { DateRangePicker } from "./-components/date-range-picker";
import { RecentTransactions } from "./-components/recent-transactions";
import { SummaryCard } from "./-components/summary-card";
import { getSixMonthsRange } from "./-components/utils";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { state, openModal, closeModal } = useModalState({
		transaction: false,
	});

	const defaultRange = getSixMonthsRange();
	const [dateRange, setDateRange] = useState(defaultRange);
	const [selectedAccountId, setSelectedAccountId] = useState<
		string | undefined
	>(undefined);

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());

	const { data: summary, isPending: isSummaryPending } = useQuery(
		trpc.transaction.summary.queryOptions({
			accountId: selectedAccountId,
			from: dateRange.from,
			to: dateRange.to,
		}),
	);

	const { data: transactions = [], isPending: isTransactionsPending } =
		useQuery(
			trpc.transaction.list.queryOptions({
				accountId: selectedAccountId,
				from: dateRange.from,
				to: dateRange.to,
			}),
		);

	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const income = summary?.income ?? 0;
	const expense = summary?.expense ?? 0;
	const balance = summary?.balance ?? 0;
	const transfer = summary?.transfer ?? 0;
	const savings = summary?.savings ?? 0;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-xl">Finance Tracker</h1>
				<div className="flex items-center gap-2">
					<AccountCombobox
						value={selectedAccountId}
						onChange={setSelectedAccountId}
						accounts={accounts}
						placeholder="All accounts"
					/>
					<DateRangePicker
						from={dateRange.from}
						to={dateRange.to}
						onChange={(from, to) => setDateRange({ from, to })}
					/>
					<Button onClick={() => openModal("transaction")}>
						Tambah Transaksi
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-5 gap-4">
				{isSummaryPending ? (
					Array.from({ length: 5 }).map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="size-4 rounded-full" />
								</div>
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-32" />
							</CardContent>
						</Card>
					))
				) : (
					<>
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
						<SummaryCard
							title="Transfer"
							value={transfer}
							icon={<ArrowLeftRight className="size-4 text-muted-foreground" />}
							highlight="neutral"
						/>
						<SummaryCard
							title="Tabungan"
							value={savings}
							icon={<PiggyBank className="size-4 text-muted-foreground" />}
							highlight="neutral"
						/>
					</>
				)}
			</div>

			{isTransactionsPending ? (
				<Skeleton className="h-64 w-full rounded-xl" />
			) : (
				<AnalyticsCard
					transactions={transactions}
					categories={categories}
					from={dateRange.from}
					to={dateRange.to}
				/>
			)}

			{isTransactionsPending ? (
				<Skeleton className="h-48 w-full rounded-xl" />
			) : (
				<RecentTransactions
					transactions={transactions}
					categories={categories}
				/>
			)}

			<CreateTransactionDialog
				open={state.transaction}
				setIsOpen={(open) =>
					open ? openModal("transaction") : closeModal("transaction")
				}
			/>
		</div>
	);
}
