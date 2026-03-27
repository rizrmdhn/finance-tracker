import type { SupportedCurrency } from "@finance-tracker/constants";
import { createId } from "@paralleldrive/cuid2";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Target } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { trpc } from "@/lib/trpc";
import { ICON_MAP } from "./form/icon-picker";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Icon } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

interface BudgetOverviewWidgetProps {
	from: number;
	to: number;
}

export function BudgetOverviewWidget({ from, to }: BudgetOverviewWidgetProps) {
	const { t } = useTranslation();
	const { format } = useFormatCurrency();

	const { data: budgets = [], isPending } = useQuery(
		trpc.budget.listWithSpent.queryOptions({ from, to }),
	);

	const sorted = [...budgets].sort((a, b) => {
		if (a.isOverBudget !== b.isOverBudget) return a.isOverBudget ? -1 : 1;
		const aPercent = a.amount > 0 ? a.spent / a.amount : 0;
		const bPercent = b.amount > 0 ? b.spent / b.amount : 0;
		return bPercent - aPercent;
	});

	const displayed = sorted.slice(0, 5);

	return (
		<Card>
			<CardHeader>
				<View className="flex-row items-center justify-between">
					<CardTitle className="text-base">
						{t("dashboard.budgetOverview")}
					</CardTitle>
					{isPending ? (
						<Skeleton className="h-3.5 w-12" />
					) : budgets.length > 0 ? (
						<Pressable onPress={() => router.push("/budgets")} hitSlop={8}>
							<Text className="text-muted-foreground text-xs">
								{t("common.viewAll")}
							</Text>
						</Pressable>
					) : null}
				</View>
			</CardHeader>
			<CardContent>
				{isPending ? (
					<View className="gap-3">
						{Array.from({ length: 3 }).map((_, _i) => (
							<View key={createId()} className="gap-1.5">
								<View className="flex-row items-center justify-between">
									<View className="flex-row items-center gap-2">
										<Skeleton className="size-3.5 rounded-full" />
										<Skeleton className="h-3.5 w-24" />
									</View>
									<Skeleton className="h-3.5 w-20" />
								</View>
								<Skeleton className="h-1.5 w-full rounded-full" />
							</View>
						))}
					</View>
				) : displayed.length === 0 ? (
					<View className="items-center gap-2 py-4">
						<Icon as={Target} className="size-8 text-muted-foreground/40" />
						<Text className="text-center text-muted-foreground text-sm">
							{t("dashboard.noBudgetsDescription")}
						</Text>
						<Pressable onPress={() => router.push("/budgets")} hitSlop={8}>
							<Text className="text-primary text-xs">
								{t("budgets.addBudget")} →
							</Text>
						</Pressable>
					</View>
				) : (
					<View className="gap-3">
						{displayed.map((budget) => {
							const BudgetIcon = budget.category?.icon
								? ICON_MAP[budget.category.icon]
								: null;
							const budgetCurrency = budget.currency as SupportedCurrency;
							const percent =
								budget.amount > 0
									? Math.min((budget.spent / budget.amount) * 100, 100)
									: 0;

							return (
								<View key={budget.id} className="gap-1.5">
									<View className="flex-row items-center justify-between gap-2">
										<View className="min-w-0 flex-1 flex-row items-center gap-2">
											{BudgetIcon ? (
												<BudgetIcon
													size={14}
													color={budget.category?.color ?? "#94a3b8"}
												/>
											) : (
												<View
													className="size-2.5 shrink-0 rounded-full"
													style={{
														backgroundColor:
															budget.category?.color ?? "#94a3b8",
													}}
												/>
											)}
											<Text
												className="flex-1 font-medium text-foreground text-sm"
												numberOfLines={1}
											>
												{budget.category?.name ?? "—"}
											</Text>
											{budget.isOverBudget && (
												<View className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5">
													<Text className="font-medium text-[10px] text-destructive leading-none">
														{t("budgets.overBudget")}
													</Text>
												</View>
											)}
										</View>
										<Text className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{format(budget.spent, budgetCurrency)} /{" "}
											{format(budget.amount, budgetCurrency)}
										</Text>
									</View>
									<View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<View
											className={`h-full rounded-full ${
												budget.isOverBudget ? "bg-destructive" : "bg-primary"
											}`}
											style={{ width: `${percent}%` }}
										/>
									</View>
								</View>
							);
						})}

						{budgets.length > 5 && (
							<Pressable
								onPress={() => router.push("/budgets")}
								className="items-center pt-1"
								hitSlop={8}
							>
								<Text className="text-center text-muted-foreground text-xs">
									+{budgets.length - 5} {t("common.more")} ·{" "}
									{t("common.viewAll")}
								</Text>
							</Pressable>
						)}
					</View>
				)}
			</CardContent>
		</Card>
	);
}
