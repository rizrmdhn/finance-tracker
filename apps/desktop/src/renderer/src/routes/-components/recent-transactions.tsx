import type { Category, Transaction } from "@finance-tracker/types";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Minus, PiggyBank } from "lucide-react";
import { useMemo } from "react";
import { formatCurrency, formatDate } from "./utils";

interface RecentTransactionsProps {
	transactions: Transaction[];
	categories: Category[];
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
}: RecentTransactionsProps) {
	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);

	const recent = transactions.slice(0, 6);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Transaksi Terbaru</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<div className="flex flex-col gap-px">
					{recent.map((tx) => {
						const type = categoryMap.get(tx.categoryId ?? "")?.type ?? "transfer";
						const config = typeConfig[type as keyof typeof typeConfig] ?? typeConfig.transfer;
						const { Icon, iconClass, amountClass, prefix } = config;
						const category = categoryMap.get(tx.categoryId ?? "");

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
									{prefix === "-" ? <Minus className="inline size-3" /> : prefix}
									{formatCurrency(tx.amount)}
								</span>
							</div>
						);
					})}
					{recent.length === 0 && (
						<p className="px-4 py-6 text-center text-muted-foreground text-sm">
							Belum ada transaksi
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
