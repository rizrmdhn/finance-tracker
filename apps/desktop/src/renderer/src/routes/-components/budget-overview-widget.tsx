import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ICON_MAP } from "@/components/icon-picker";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { trpc } from "@/lib/trpc";

interface BudgetOverviewWidgetProps {
	from: number;
	to: number;
}

export function BudgetOverviewWidget({
	from,
	to,
}: BudgetOverviewWidgetProps) {
	const { t } = useTranslation();
	const { format } = useFormatCurrency();

	const { data: budgets = [], isPending } = useQuery(
		trpc.budget.listWithSpent.queryOptions({ from, to }),
	);

	// Sort: over-budget first, then by % used descending
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
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						{t("dashboard.budgetOverview")}
					</CardTitle>
					{isPending ? (
						<Skeleton className="h-3.5 w-12" />
					) : budgets.length > 0 ? (
						<Link
							to="/budgets"
							className="text-muted-foreground text-xs transition-colors hover:text-foreground"
						>
							{t("common.viewAll")}
						</Link>
					) : null}
				</div>
			</CardHeader>
			<CardContent>
				{isPending ? (
					<div className="flex flex-col gap-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Skeleton className="size-3.5 rounded-full" />
										<Skeleton className="h-3.5 w-24" />
									</div>
									<Skeleton className="h-3.5 w-20" />
								</div>
								<Skeleton className="h-1.5 w-full rounded-full" />
							</div>
						))}
					</div>
				) : displayed.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-4 text-center">
						<Target className="size-8 text-muted-foreground/40" />
						<p className="text-muted-foreground text-sm">
							{t("dashboard.noBudgetsDescription")}
						</p>
						<Link
							to="/budgets"
							className="text-primary text-xs hover:underline"
						>
							{t("budgets.addBudget")} →
						</Link>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{displayed.map((budget) => {
							const Icon = budget.category?.icon
								? ICON_MAP[budget.category.icon]
								: null;
							const budgetCurrency = budget.currency as SupportedCurrency;
							const percent =
								budget.amount > 0
									? Math.min((budget.spent / budget.amount) * 100, 100)
									: 0;

							return (
								<div key={budget.id} className="flex flex-col gap-1.5">
									<div className="flex items-center justify-between gap-2">
										<div className="flex min-w-0 items-center gap-2">
											{Icon ? (
												<Icon
													className="size-3.5 shrink-0"
													style={{
														color: budget.category?.color ?? "#94a3b8",
													}}
												/>
											) : (
												<span
													className="size-2.5 shrink-0 rounded-full"
													style={{
														backgroundColor:
															budget.category?.color ?? "#94a3b8",
													}}
												/>
											)}
											<span className="truncate font-medium text-sm">
												{budget.category?.name ?? "—"}
											</span>
											{budget.isOverBudget && (
												<span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 font-medium text-[10px] text-destructive leading-none">
													{t("budgets.overBudget")}
												</span>
											)}
										</div>
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{format(budget.spent, budgetCurrency)} /{" "}
											{format(budget.amount, budgetCurrency)}
										</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											className={`h-full rounded-full transition-all ${
												budget.isOverBudget ? "bg-destructive" : "bg-primary"
											}`}
											style={{ width: `${percent}%` }}
										/>
									</div>
								</div>
							);
						})}

						{budgets.length > 5 && (
							<Link
								to="/budgets"
								className="pt-1 text-center text-muted-foreground text-xs transition-colors hover:text-foreground"
							>
								+{budgets.length - 5} {t("common.more")} · {t("common.viewAll")}
							</Link>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
