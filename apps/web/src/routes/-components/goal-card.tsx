import { Badge } from "@finance-tracker/ui/components/badge";
import { Button } from "@finance-tracker/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@finance-tracker/ui/components/dropdown-menu";
import type { TargetDateGap } from "@finance-tracker/utils";
import {
	ArchiveIcon,
	ArrowDownToLineIcon,
	ArrowUpFromLineIcon,
	EllipsisIcon,
	ExternalLinkIcon,
	EyeIcon,
	LightbulbIcon,
	PencilIcon,
	ShoppingBagIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ICON_MAP } from "@/components/icon-picker";
import { formatAmount, type GoalOverviewItem, useGoalText } from "./goal-utils";

type GoalAction = (item: GoalOverviewItem) => void;

/** Each action shows up in the card only when its callback is passed. */
interface GoalCardProps {
	item: GoalOverviewItem;
	onOpenDetail?: GoalAction;
	onEdit?: GoalAction;
	onSetAside?: GoalAction;
	onWithdraw?: GoalAction;
	onPurchase?: GoalAction;
	onArchive?: GoalAction;
	onDelete?: GoalAction;
}

export default function GoalCard({
	item,
	onOpenDetail,
	onEdit,
	onSetAside,
	onWithdraw,
	onPurchase,
	onArchive,
	onDelete,
}: GoalCardProps) {
	const { t } = useTranslation();
	const { goal, progress } = item;
	const Icon = ICON_MAP[goal.icon];
	const isActive = goal.status === "active";
	const percent =
		goal.targetAmount > 0 ? (progress.total / goal.targetAmount) * 100 : 0;
	const format = (amount: number) => formatAmount(amount, goal.currency);

	// Funds can only move, and a goal can only be bought or archived, while it's active
	const activeOnly = (action?: GoalAction) => (isActive ? action : undefined);
	const menuActions = [
		{ icon: EyeIcon, label: t("common.seeDetails"), on: onOpenDetail },
		{ icon: PencilIcon, label: t("common.edit"), on: onEdit },
		{
			icon: ArrowDownToLineIcon,
			label: t("goals.contribution.setAside"),
			on: activeOnly(onSetAside),
		},
		{
			icon: ArrowUpFromLineIcon,
			label: t("goals.contribution.withdraw"),
			on: activeOnly(onWithdraw),
		},
		{
			icon: ShoppingBagIcon,
			label: t("goals.purchase.action"),
			on: activeOnly(onPurchase),
		},
		{
			icon: ArchiveIcon,
			label: t("goals.archive.action"),
			on: activeOnly(onArchive),
		},
	].filter((action) => action.on);

	return (
		<div className="flex flex-col gap-4 rounded-lg border px-4 py-3">
			<div className="flex items-center gap-3">
				<div
					className="flex size-9 shrink-0 items-center justify-center rounded-full"
					style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
				>
					{Icon && <Icon className="size-4" />}
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					{onOpenDetail ? (
						<button
							type="button"
							className="truncate text-left font-medium text-sm hover:underline"
							onClick={() => onOpenDetail(item)}
						>
							{goal.name}
						</button>
					) : (
						<span className="truncate font-medium text-sm">{goal.name}</span>
					)}
					{goal.productUrl && (
						<a
							href={goal.productUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground hover:underline"
						>
							<ExternalLinkIcon className="size-3" />
							{t("goals.card.openProduct")}
						</a>
					)}
				</div>
				<GoalStatusBadge item={item} />
				{(menuActions.length > 0 || onDelete) && (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={t("common.more")}
								/>
							}
						>
							<EllipsisIcon className="size-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{menuActions.map(({ icon: ActionIcon, label, on }) => (
								<DropdownMenuItem key={label} onClick={() => on?.(item)}>
									<ActionIcon />
									{label}
								</DropdownMenuItem>
							))}
							{onDelete && (
								<>
									{menuActions.length > 0 && <DropdownMenuSeparator />}
									<DropdownMenuItem
										variant="destructive"
										onClick={() => onDelete(item)}
									>
										<Trash2Icon />
										{t("common.delete")}
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
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

			{isActive && progress.isReached && (
				<div className="flex flex-col gap-2 rounded-md bg-muted/50 px-3 py-2">
					<div>
						<p className="font-medium text-sm">{t("goals.estimate.reached")}</p>
						<p className="text-muted-foreground text-xs">
							{t("goals.estimate.reachedDescription")}
						</p>
					</div>
					{onPurchase && (
						<Button
							size="sm"
							className="w-fit"
							onClick={() => onPurchase(item)}
						>
							<ShoppingBagIcon />
							{t("goals.purchase.action")}
						</Button>
					)}
				</div>
			)}

			{!progress.isReached && <GoalEstimate item={item} />}
		</div>
	);
}

function GoalStatusBadge({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { status } = item.goal;

	if (status === "active" && item.progress.isReached)
		return <Badge>{t("goals.status.reached")}</Badge>;

	return (
		<Badge variant={status === "active" ? "outline" : "secondary"}>
			{t(`goals.status.${status}`)}
		</Badge>
	);
}

/** Estimate, its basis, the insight and the target-date check of an active goal. */
function GoalEstimate({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { duration, timeLeft, formatMonth, formatDate } = useGoalText();
	const { goal, estimate } = item;

	if (!estimate) return null;

	const format = (amount: number) => formatAmount(amount, goal.currency);
	const { completion, pace, targetDateGap } = estimate;
	const main = estimate.duration.main;
	const { min, max } = estimate.duration;
	const range = min && max ? [duration(min), duration(max)] : null;

	return (
		<div className="flex flex-col gap-2 border-t pt-3">
			{completion.status === "no-surplus" ? (
				<p className="text-muted-foreground text-sm">
					{estimate.monthlySurplus.length === 0
						? t("goals.estimate.noHistory")
						: t("goals.estimate.noSurplus")}
				</p>
			) : (
				main && (
					<div className="flex flex-col gap-1">
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="font-medium text-sm">{timeLeft(main)}</span>
							{pace.source === "potential" && (
								<Badge variant="outline">{t("goals.estimate.initial")}</Badge>
							)}
							{completion.isRough && (
								<Badge
									variant="outline"
									title={t("goals.estimate.roughDescription")}
								>
									{t("goals.estimate.rough")}
								</Badge>
							)}
						</div>
						{main.unit !== "overCap" && completion.estimatedDate && (
							<p className="text-muted-foreground text-xs">
								{t("goals.estimate.estimatedDate", {
									date: formatMonth(completion.estimatedDate),
								})}
							</p>
						)}
						{range && range[0] !== range[1] && (
							<p className="text-muted-foreground text-xs">
								{t("goals.estimate.range", { min: range[0], max: range[1] })}
							</p>
						)}
						<p className="text-muted-foreground text-xs">
							{pace.source === "real"
								? t("goals.estimate.basedOnSavings", {
										amount: format(pace.realMonthly ?? 0),
									})
								: t("goals.estimate.basedOnSurplus", {
										percent: goal.allocationPercent,
										amount: format(estimate.surplusMonthly ?? 0),
									})}
						</p>
					</div>
				)
			)}

			{pace.showInsight && (
				<div className="flex gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
					<LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
					<p>
						{t("goals.insight.potential", {
							amount: format(pace.potentialMonthly ?? 0),
						})}
					</p>
				</div>
			)}

			{targetDateGap && goal.targetDate !== null && (
				<GoalTargetDate
					date={formatDate(goal.targetDate)}
					gap={targetDateGap}
					format={format}
				/>
			)}
		</div>
	);
}

function GoalTargetDate({
	date,
	gap,
	format,
}: {
	date: string;
	gap: TargetDateGap;
	format: (amount: number) => string;
}) {
	const { t } = useTranslation();

	if (gap.isPast)
		return (
			<p className="text-destructive text-xs">
				{t("goals.targetDate.past", { date })}
			</p>
		);

	if (gap.onTrack)
		return (
			<p className="text-emerald-600 text-xs dark:text-emerald-400">
				{t("goals.targetDate.onTrack", { date })}
			</p>
		);

	return (
		<div className="flex flex-col text-xs">
			<span className="text-muted-foreground">
				{t("goals.targetDate.label", { date })}
			</span>
			<span className="text-amber-600 dark:text-amber-400">
				{t("goals.targetDate.behind", {
					amount: format(gap.requiredMonthly ?? 0),
					gap: format(gap.gap ?? 0),
				})}
			</span>
		</div>
	);
}
