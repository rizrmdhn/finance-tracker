import type { Category, Transaction } from "@finance-tracker/types";
import {
	ArrowDownLeft,
	ArrowLeftRight,
	ArrowUpRight,
	Minus,
	PiggyBank,
} from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Icon as IconComp } from "./ui/icon";
import { Text } from "./ui/text";

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
	const { t } = useTranslation();

	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);

	const recent = transactions.slice(0, 6);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("common.recentTransactions")}</CardTitle>
				<Text
					className="text-muted-foreground text-xs hover:text-foreground"
					onPress={() => {}}
				>
					{t("common.viewAll")}
				</Text>
			</CardHeader>
			<CardContent>
				<View className="flex flex-col gap-4">
					{recent.map((tx) => {
						const type =
							categoryMap.get(tx.categoryId ?? "")?.type ?? "transfer";
						const config =
							typeConfig[type as keyof typeof typeConfig] ??
							typeConfig.transfer;
						const { Icon, iconClass, amountClass, prefix } = config;
						const category = categoryMap.get(tx.categoryId ?? "");

						return (
							<View
								key={tx.id}
								className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
							>
								<View
									className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
								>
									<IconComp as={Icon} className="size-4" />
								</View>
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
										<IconComp as={Minus} className="inline size-3" />
									) : (
										prefix
									)}
									{formatCurrency(tx.amount)}
								</span>
							</View>
						);
					})}
					{recent.length === 0 && (
						<Text className="px-4 py-6 text-center text-muted-foreground text-sm">
							{t("common.noTransactions")}
						</Text>
					)}
				</View>
			</CardContent>
		</Card>
	);
}
