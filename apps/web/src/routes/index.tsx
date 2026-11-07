import type { SupportedCurrency } from "@finance-tracker/constants";
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
import { useTranslation } from "react-i18next";
import { AccountCombobox } from "@/components/account-combobox";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import useModalState from "@/hooks/use-modal-state";
import { trpc } from "../lib/trpc";
import { AnalyticsCard } from "./-components/analytics-card";
import { BudgetOverviewWidget } from "./-components/budget-overview-widget";
import CreateTransactionDialog from "./-components/create-transaction-dialog";
import { DateRangePicker } from "./-components/date-range-picker";
import { GoalsWidget } from "./-components/goals-widget";
import { RecentTransactions } from "./-components/recent-transactions";
import { SummaryCard } from "./-components/summary-card";
import { getCurrentMonthRange } from "./-components/utils";

/**
 * Column spans for balance, income, expense, transfer, savings.
 * Narrow: 2 columns, balance full width. Medium: 6 columns, rows of 3 then 2.
 * Wide: all 5 in one row. Based on the content width, not the window, since the sidebar can collapse.
 */
const SUMMARY_CARD_SPANS = [
	"col-span-2 @6xl:col-span-1",
	"@3xl:col-span-2 @6xl:col-span-1",
	"@3xl:col-span-2 @6xl:col-span-1",
	"@3xl:col-span-3 @6xl:col-span-1",
	"@3xl:col-span-3 @6xl:col-span-1",
];

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { t } = useTranslation();
	const { state, openModal, closeModal } = useModalState({
		transaction: false,
	});
	const { displayCurrency } = useFormatCurrency();

	const defaultRange = getCurrentMonthRange();
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
			displayCurrency,
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

	const sourceCurrency = (accounts.find((a) => a.id === selectedAccountId)
		?.currency ?? displayCurrency) as SupportedCurrency;

	const income = summary?.income ?? 0;
	const expense = summary?.expense ?? 0;
	const balance = summary?.balance ?? 0;
	const transfer = summary?.transfer ?? 0;
	const savings = summary?.savings ?? 0;

	return (
		<div className="@container flex flex-col gap-6 p-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="font-semibold text-xl">{t("app.title")}</h1>
				<div className="flex flex-wrap items-center gap-2">
					<AccountCombobox
						value={selectedAccountId}
						onChange={setSelectedAccountId}
						accounts={accounts}
						placeholder={t("common.allAccounts")}
					/>
					<DateRangePicker
						from={dateRange.from}
						to={dateRange.to}
						onChange={(from, to) => setDateRange({ from, to })}
					/>
					<Button onClick={() => openModal("transaction")}>
						{t("dashboard.addTransaction")}
					</Button>
				</div>
			</div>

			<div className="grid @3xl:grid-cols-6 @6xl:grid-cols-5 grid-cols-2 gap-4">
				{isSummaryPending ? (
					SUMMARY_CARD_SPANS.map((span, i) => (
						<Card key={i} className={span}>
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
							className={SUMMARY_CARD_SPANS[0]}
							title={t("dashboard.balance")}
							value={balance}
							icon={<Wallet className="size-4 text-muted-foreground" />}
							highlight={balance >= 0 ? "positive" : "negative"}
							sourceCurrency={displayCurrency}
						/>
						<SummaryCard
							className={SUMMARY_CARD_SPANS[1]}
							title={t("dashboard.income")}
							value={income}
							icon={<TrendingUp className="size-4 text-muted-foreground" />}
							highlight="positive"
							sourceCurrency={displayCurrency}
						/>
						<SummaryCard
							className={SUMMARY_CARD_SPANS[2]}
							title={t("dashboard.expense")}
							value={expense}
							icon={<TrendingDown className="size-4 text-muted-foreground" />}
							highlight="negative"
							sourceCurrency={displayCurrency}
						/>
						<SummaryCard
							className={SUMMARY_CARD_SPANS[3]}
							title={t("dashboard.transfer")}
							value={transfer}
							icon={<ArrowLeftRight className="size-4 text-muted-foreground" />}
							highlight="neutral"
							sourceCurrency={displayCurrency}
						/>
						<SummaryCard
							className={SUMMARY_CARD_SPANS[4]}
							title={t("dashboard.savings")}
							value={savings}
							icon={<PiggyBank className="size-4 text-muted-foreground" />}
							highlight="neutral"
							sourceCurrency={displayCurrency}
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
					sourceCurrency={sourceCurrency}
				/>
			)}

			{isTransactionsPending ? (
				<Skeleton className="h-48 w-full rounded-xl" />
			) : (
				<RecentTransactions
					transactions={transactions}
					categories={categories}
					accounts={accounts}
					sourceCurrency={sourceCurrency}
				/>
			)}

			<BudgetOverviewWidget from={dateRange.from} to={dateRange.to} />

			<GoalsWidget />

			<CreateTransactionDialog
				open={state.transaction}
				setIsOpen={(open) =>
					open ? openModal("transaction") : closeModal("transaction")
				}
			/>
		</div>
	);
}
