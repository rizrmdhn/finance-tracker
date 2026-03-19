import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";
import { formatCurrency, formatDate } from "./utils";

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

export function RecentTransactions() {
	return (
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
								<span className="truncate font-medium text-sm">{tx.note}</span>
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
	);
}
