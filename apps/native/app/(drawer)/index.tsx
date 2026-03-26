import { createId } from "@paralleldrive/cuid2";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeftRight,
	PiggyBank,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AnalyticsCard } from "@/components/analytics-card";
import { BudgetOverviewWidget } from "@/components/budget-overview-widget";
import { Container } from "@/components/container";
import { AccountCombobox } from "@/components/form/account-combobox";
import CreateTransactionDialog from "@/components/form/create-transaction-dialog";
import { DateRangePicker } from "@/components/form/date-range-picker";
import { RecentTransactions } from "@/components/recent-transactions";
import { SummaryCard } from "@/components/summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import useModalState from "@/hooks/use-modal-state";
import { trpc } from "@/lib/trpc";
import { getCurrentMonthRange } from "@/lib/utils";

export default function Home() {
	const { t } = useTranslation();
	const { state, openModal, closeModal } = useModalState({
		transaction: false,
	});

	const defaultRange = getCurrentMonthRange();
	const [dateRange, setDateRange] = useState(defaultRange);
	const [selectedAccountId, setSelectedAccountId] = useState<
		string | undefined
	>(undefined);

	const { data: accounts = [], refetch: refetchAccounts } = useQuery(
		trpc.account.list.queryOptions(),
	);

	const {
		data: summary,
		isPending: isSummaryPending,
		refetch: refetchSummary,
	} = useQuery(
		trpc.transaction.summary.queryOptions({
			accountId: selectedAccountId,
			from: dateRange.from,
			to: dateRange.to,
		}),
	);

	const {
		data: transactions = [],
		isPending: isTransactionsPending,
		refetch: refetchTransactions,
	} = useQuery(
		trpc.transaction.list.queryOptions({
			accountId: selectedAccountId,
			from: dateRange.from,
			to: dateRange.to,
		}),
	);

	const { data: categories = [], refetch: refetchCategories } = useQuery(
		trpc.category.list.queryOptions(),
	);

	const [refreshing, setRefreshing] = useState(false);
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await Promise.all([
			refetchAccounts(),
			refetchSummary(),
			refetchTransactions(),
			refetchCategories(),
		]);
		setRefreshing(false);
	}, [refetchAccounts, refetchSummary, refetchTransactions, refetchCategories]);

	const income = summary?.income ?? 0;
	const expense = summary?.expense ?? 0;
	const balance = summary?.balance ?? 0;
	const transfer = summary?.transfer ?? 0;
	const savings = summary?.savings ?? 0;

	return (
		<Container
			contentContainerClassName="gap-6 px-6 py-3"
			onRefresh={handleRefresh}
			refreshing={refreshing}
		>
			<View className="gap-2">
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
				<Button onPress={() => openModal("transaction")}>
					<Text>{t("dashboard.addTransaction")}</Text>
				</Button>
			</View>

			<View className="flex-row flex-wrap gap-3">
				{isSummaryPending ? (
					Array.from({ length: 5 }).map((_) => (
						<View key={createId()} className="w-[48%]">
							<Card>
								<CardHeader>
									<View className="flex-row items-center justify-between">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="size-4 rounded-full" />
									</View>
								</CardHeader>
								<CardContent>
									<Skeleton className="h-8 w-32" />
								</CardContent>
							</Card>
						</View>
					))
				) : (
					<>
						<View className="w-[48%]">
							<SummaryCard
								title={t("dashboard.balance")}
								value={balance}
								icon={
									<Icon as={Wallet} className="size-4 text-muted-foreground" />
								}
								highlight={balance >= 0 ? "positive" : "negative"}
							/>
						</View>
						<View className="w-[48%]">
							<SummaryCard
								title={t("dashboard.income")}
								value={income}
								icon={
									<Icon
										as={TrendingUp}
										className="size-4 text-muted-foreground"
									/>
								}
								highlight="positive"
							/>
						</View>
						<View className="w-[48%]">
							<SummaryCard
								title={t("dashboard.expense")}
								value={expense}
								icon={
									<Icon
										as={TrendingDown}
										className="size-4 text-muted-foreground"
									/>
								}
								highlight="negative"
							/>
						</View>
						<View className="w-[48%]">
							<SummaryCard
								title={t("dashboard.transfer")}
								value={transfer}
								icon={
									<Icon
										as={ArrowLeftRight}
										className="size-4 text-muted-foreground"
									/>
								}
								highlight="neutral"
							/>
						</View>
						<View className="w-[48%]">
							<SummaryCard
								title={t("dashboard.savings")}
								value={savings}
								icon={
									<Icon
										as={PiggyBank}
										className="size-4 text-muted-foreground"
									/>
								}
								highlight="neutral"
							/>
						</View>
					</>
				)}
			</View>

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

			<BudgetOverviewWidget from={dateRange.from} to={dateRange.to} />

			<CreateTransactionDialog
				open={state.transaction}
				setIsOpen={(open) =>
					open ? openModal("transaction") : closeModal("transaction")
				}
			/>
		</Container>
	);
}
