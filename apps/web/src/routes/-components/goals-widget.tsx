import { Badge } from "@finance-tracker/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PiggyBank } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ICON_MAP } from "@/components/icon-picker";
import { trpc } from "@/lib/trpc";
import { formatAmount, useGoalText } from "./goal-utils";

const MAX_GOALS = 3;

/** The top-priority active goals with their progress and estimate. */
export function GoalsWidget() {
	const { t } = useTranslation();
	const { timeLeft } = useGoalText();

	// Already in priority order
	const { data: overview = [], isPending } = useQuery(
		trpc.goal.overview.queryOptions(),
	);
	const activeGoals = overview.filter((item) => item.goal.status === "active");
	const displayed = activeGoals.slice(0, MAX_GOALS);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">{t("goals.widget.title")}</CardTitle>
					{isPending ? (
						<Skeleton className="h-3.5 w-12" />
					) : activeGoals.length > 0 ? (
						<Link
							to="/goals"
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
						{Array.from({ length: 2 }).map((_, i) => (
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
						<PiggyBank className="size-8 text-muted-foreground/40" />
						<p className="text-muted-foreground text-sm">
							{t("goals.widget.noGoals")}
						</p>
						<Link to="/goals" className="text-primary text-xs hover:underline">
							{t("goals.addGoal")} →
						</Link>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{displayed.map(({ goal, progress, estimate }) => {
							const Icon = ICON_MAP[goal.icon];
							const percent =
								goal.targetAmount > 0
									? Math.min((progress.total / goal.targetAmount) * 100, 100)
									: 0;
							const main =
								estimate?.completion.status === "estimated"
									? estimate.duration.main
									: null;

							return (
								<Link
									key={goal.id}
									to="/goals"
									className="group flex flex-col gap-1.5"
								>
									<div className="flex items-center justify-between gap-2">
										<div className="flex min-w-0 items-center gap-2">
											{Icon && (
												<Icon
													className="size-3.5 shrink-0"
													style={{ color: goal.color }}
												/>
											)}
											<span className="truncate font-medium text-sm group-hover:underline">
												{goal.name}
											</span>
											{progress.isReached && (
												<Badge>{t("goals.status.reached")}</Badge>
											)}
										</div>
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{formatAmount(progress.total, goal.currency)} /{" "}
											{formatAmount(goal.targetAmount, goal.currency)}
										</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full transition-all"
											style={{
												width: `${percent}%`,
												backgroundColor: goal.color,
											}}
										/>
									</div>
									{!progress.isReached && main && (
										<span className="text-muted-foreground text-xs">
											{timeLeft(main)}
										</span>
									)}
								</Link>
							);
						})}

						{activeGoals.length > MAX_GOALS && (
							<Link
								to="/goals"
								className="pt-1 text-center text-muted-foreground text-xs transition-colors hover:text-foreground"
							>
								+{activeGoals.length - MAX_GOALS} {t("common.more")} ·{" "}
								{t("common.viewAll")}
							</Link>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
