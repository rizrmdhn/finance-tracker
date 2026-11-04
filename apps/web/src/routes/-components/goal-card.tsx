import { Badge } from "@finance-tracker/ui/components/badge";
import { useTranslation } from "react-i18next";
import { ICON_MAP } from "@/components/icon-picker";
import { formatAmount, type GoalOverviewItem } from "./goal-utils";

interface GoalCardProps {
	item: GoalOverviewItem;
}

export default function GoalCard({ item }: GoalCardProps) {
	const { t } = useTranslation();
	const { goal, progress } = item;
	const Icon = ICON_MAP[goal.icon];
	const isActive = goal.status === "active";
	const percent =
		goal.targetAmount > 0 ? (progress.total / goal.targetAmount) * 100 : 0;
	const format = (amount: number) => formatAmount(amount, goal.currency);

	return (
		<div className="flex flex-col gap-4 rounded-lg border px-4 py-3">
			<div className="flex items-center gap-3">
				<div
					className="flex size-9 shrink-0 items-center justify-center rounded-full"
					style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
				>
					{Icon && <Icon className="size-4" />}
				</div>
				<span className="min-w-0 flex-1 truncate font-medium text-sm">
					{goal.name}
				</span>
				<Badge
					variant={isActive && !progress.isReached ? "outline" : "secondary"}
				>
					{isActive && progress.isReached
						? t("goals.status.reached")
						: t(`goals.status.${goal.status}`)}
				</Badge>
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex justify-between gap-2 text-xs">
					<span className="text-muted-foreground">
						{t("goals.card.progress", {
							current: format(progress.total),
							target: format(goal.targetAmount),
						})}
					</span>
					<span className="font-medium">
						{t("goals.card.percent", { percent: Math.floor(percent) })}
					</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full transition-all"
						style={{
							width: `${Math.min(percent, 100)}%`,
							backgroundColor: goal.color,
						}}
					/>
				</div>
				{!progress.isReached && (
					<p className="text-muted-foreground text-xs">
						{t("goals.card.remaining", {
							amount: format(goal.targetAmount - progress.total),
						})}
					</p>
				)}
			</div>
		</div>
	);
}
