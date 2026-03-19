import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";
import { useMemo } from "react";
import {
	type Category,
	formatCurrency,
	formatDate,
	type Transaction,
} from "./utils";

interface RecentTransactionsProps {
	transactions: Transaction[];
	categories: Category[];
}

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
						const type = categoryMap.get(tx.categoryId ?? "")?.type;
						const isIncome = type === "income";

						return (
							<div
								key={tx.id}
								className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
							>
								<div
									className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
										isIncome
											? "bg-green-500/10 text-green-600"
											: "bg-red-500/10 text-red-500"
									}`}
								>
									{isIncome ? (
										<ArrowDownLeft className="size-4" />
									) : (
										<ArrowUpRight className="size-4" />
									)}
								</div>
								<div className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm">
										{tx.note ?? "—"}
									</span>
									<span className="text-muted-foreground text-xs">
										{formatDate(tx.date)}
									</span>
								</div>
								<span
									className={`font-medium text-sm tabular-nums ${
										isIncome ? "text-green-600" : "text-red-500"
									}`}
								>
									{isIncome ? "+" : <Minus className="inline size-3" />}
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
