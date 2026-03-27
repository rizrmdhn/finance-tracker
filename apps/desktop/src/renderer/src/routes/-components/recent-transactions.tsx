import type { SupportedCurrency } from "@finance-tracker/constants";
import type { Account, Category, Transaction } from "@finance-tracker/types";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { Link } from "@tanstack/react-router";
import {
	ArrowDownLeft,
	ArrowLeftRight,
	ArrowUpRight,
	Minus,
	PiggyBank,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { formatDate } from "./utils";

interface RecentTransactionsProps {
	transactions: Transaction[];
	categories: Category[];
	accounts: Account[];
	sourceCurrency?: SupportedCurrency;
}

const typeConfig = {
	income: {
		iconClass: "bg-green-500/10 text-green-600",
		amountClass: "text-green-600",
		Icon: ArrowDownLeft,
		prefix: "+",
	},
	expense: {
		iconClass: "bg-red-500/10 text-red-500",
		amountClass: "text-red-500",
		Icon: ArrowUpRight,
		prefix: "-",
	},
	savings: {
		iconClass: "bg-violet-500/10 text-violet-500",
		amountClass: "text-violet-500",
		Icon: PiggyBank,
		prefix: "-",
	},
	transfer: {
		iconClass: "bg-blue-500/10 text-blue-500",
		amountClass: "text-muted-foreground",
		Icon: ArrowLeftRight,
		prefix: "",
	},
} as const;

export function RecentTransactions({
	transactions,
	categories,
	accounts,
	sourceCurrency,
}: RecentTransactionsProps) {
	const { t } = useTranslation();
	const { format } = useFormatCurrency();
	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);
	const accountMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a])),
		[accounts],
	);

	const recent = transactions.slice(0, 6);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("common.recentTransactions")}</CardTitle>
				<Link
					to="/transactions"
					className="text-muted-foreground text-xs hover:text-foreground"
				>
					{t("common.viewAll")}
				</Link>
			</CardHeader>
			<CardContent className="p-0">
				<div className="flex flex-col gap-px">
					{recent.map((tx) => {
						const type =
							categoryMap.get(tx.categoryId ?? "")?.type ?? "transfer";
						const config =
							typeConfig[type as keyof typeof typeConfig] ??
							typeConfig.transfer;
						const { Icon, iconClass, amountClass, prefix } = config;
						const category = categoryMap.get(tx.categoryId ?? "");
						const txCurrency = (accountMap.get(tx.accountId)?.currency as SupportedCurrency) ?? sourceCurrency;

						return (
							<div
								key={tx.id}
								className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
							>
								<div
									className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
								>
									<Icon className="size-4" />
								</div>
								<div className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm">
										{tx.note ?? category?.name ?? "—"}
									</span>
									<span className="text-muted-foreground text-xs">
										{formatDate(tx.date)}
									</span>
								</div>
								<span
									className={`font-medium text-sm tabular-nums ${amountClass}`}
								>
									{prefix === "-" ? (
										<Minus className="inline size-3" />
									) : (
										prefix
									)}
									{format(tx.amount, txCurrency)}
								</span>
							</div>
						);
					})}
					{recent.length === 0 && (
						<p className="px-4 py-6 text-center text-muted-foreground text-sm">
							{t("common.noTransactions")}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
