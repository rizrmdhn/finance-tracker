import { formatCurrency, type TargetDateGap } from "@finance-tracker/utils";
import {
	ExternalLinkIcon,
	LightbulbIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, View } from "react-native";
import { type GoalOverviewItem, useGoalText } from "@/hooks/use-goal";
import { ICON_MAP } from "./form/icon-picker";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Icon as IconComp } from "./ui/icon";
import { Text } from "./ui/text";

type GoalAction = (item: GoalOverviewItem) => void;

/** Pressing the card calls `onPress` (the detail sheet); edit and delete show when passed. */
interface GoalCardProps {
	item: GoalOverviewItem;
	onPress?: GoalAction;
	onEdit?: GoalAction;
	onDelete?: GoalAction;
}

export function GoalCard({ item, onPress, onEdit, onDelete }: GoalCardProps) {
	const { t } = useTranslation();
	const { goal, progress } = item;
	const isActive = goal.status === "active";

	return (
		<Pressable
			disabled={!onPress}
			onPress={() => onPress?.(item)}
			className="flex flex-col gap-4 rounded-lg border border-border px-4 py-3 active:bg-accent/50"
		>
			<GoalHeader item={item}>
				{(onEdit || onDelete) && (
					<View className="flex shrink-0 flex-row items-center">
						{onEdit && (
							<Button
								variant="ghost"
								size="sm"
								accessibilityLabel={t("common.edit")}
								onPress={() => onEdit(item)}
							>
								<IconComp as={PencilIcon} className="size-3.5" />
							</Button>
						)}
						{onDelete && (
							<Button
								variant="ghost"
								size="sm"
								accessibilityLabel={t("common.delete")}
								onPress={() => onDelete(item)}
							>
								<IconComp
									as={Trash2Icon}
									className="size-3.5 text-destructive"
								/>
							</Button>
						)}
					</View>
				)}
			</GoalHeader>

			<GoalProgress item={item} />

			{isActive && progress.isReached && (
				<View className="flex flex-col rounded-md bg-muted/50 px-3 py-2">
					<Text className="font-medium text-sm">
						{t("goals.estimate.reached")}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{t("goals.estimate.reachedDescription")}
					</Text>
				</View>
			)}

			{!progress.isReached && <GoalEstimate item={item} />}
		</Pressable>
	);
}

/** Icon, name, product link and status badge; `children` go after the badge. */
export function GoalHeader({
	item,
	children,
}: {
	item: GoalOverviewItem;
	children?: React.ReactNode;
}) {
	const { t } = useTranslation();
	const { goal } = item;
	const Icon = ICON_MAP[goal.icon];
	const { productUrl } = goal;

	return (
		<View className="flex flex-row items-center gap-3">
			<View
				className="size-9 shrink-0 items-center justify-center rounded-full"
				style={{ backgroundColor: `${goal.color}1a` }}
			>
				{Icon && <IconComp as={Icon} className="size-4" color={goal.color} />}
			</View>
			<View className="min-w-0 flex-1 flex-col">
				<Text className="font-medium text-sm" numberOfLines={1}>
					{goal.name}
				</Text>
				{productUrl && (
					<Pressable
						hitSlop={8}
						className="flex flex-row items-center gap-1 self-start"
						onPress={() => Linking.openURL(productUrl)}
					>
						<IconComp
							as={ExternalLinkIcon}
							className="size-3 text-muted-foreground"
						/>
						<Text className="text-muted-foreground text-xs">
							{t("goals.card.openProduct")}
						</Text>
					</Pressable>
				)}
			</View>
			<GoalStatusBadge item={item} />
			{children}
		</View>
	);
}

/** "X of Y", percent, progress bar and what's left. */
export function GoalProgress({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { goal, progress } = item;
	const percent =
		goal.targetAmount > 0 ? (progress.total / goal.targetAmount) * 100 : 0;
	const format = (amount: number) => formatCurrency(amount, goal.currency);

	return (
		<View className="flex flex-col gap-1.5">
			<View className="flex flex-row justify-between gap-2">
				<Text className="flex-1 text-muted-foreground text-xs">
					{t("goals.card.progress", {
						current: format(progress.total),
						target: format(goal.targetAmount),
					})}
				</Text>
				<Text className="font-medium text-xs">
					{t("goals.card.percent", { percent: Math.floor(percent) })}
				</Text>
			</View>
			<View className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<View
					className="h-full rounded-full"
					style={{
						width: `${Math.min(percent, 100)}%`,
						backgroundColor: goal.color,
					}}
				/>
			</View>
			{!progress.isReached && (
				<Text className="text-muted-foreground text-xs">
					{t("goals.card.remaining", {
						amount: format(goal.targetAmount - progress.total),
					})}
				</Text>
			)}
		</View>
	);
}

export function GoalStatusBadge({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { status } = item.goal;

	if (status === "active" && item.progress.isReached)
		return (
			<Badge>
				<Text>{t("goals.status.reached")}</Text>
			</Badge>
		);

	return (
		<Badge variant={status === "active" ? "outline" : "secondary"}>
			<Text>{t(`goals.status.${status}`)}</Text>
		</Badge>
	);
}

/** Estimate, its basis, the insight and the target-date check of an active goal. */
export function GoalEstimate({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { duration, timeLeft, formatMonth, formatDate } = useGoalText();
	const { goal, estimate } = item;

	if (!estimate) return null;

	const format = (amount: number) => formatCurrency(amount, goal.currency);
	const { completion, pace, targetDateGap } = estimate;
	const main = estimate.duration.main;
	const { min, max } = estimate.duration;
	const range = min && max ? [duration(min), duration(max)] : null;

	return (
		<View className="flex flex-col gap-2 border-border border-t pt-3">
			{completion.status === "no-surplus" ? (
				<Text className="text-muted-foreground text-sm">
					{estimate.monthlySurplus.length === 0
						? t("goals.estimate.noHistory")
						: t("goals.estimate.noSurplus")}
				</Text>
			) : (
				main && (
					<View className="flex flex-col gap-1">
						<View className="flex flex-row flex-wrap items-center gap-1.5">
							<Text className="font-medium text-sm">{timeLeft(main)}</Text>
							{pace.source === "potential" && (
								<Badge variant="outline">
									<Text>{t("goals.estimate.initial")}</Text>
								</Badge>
							)}
							{completion.isRough && (
								<Badge variant="outline">
									<Text>{t("goals.estimate.rough")}</Text>
								</Badge>
							)}
						</View>
						{completion.isRough && (
							<Text className="text-muted-foreground text-xs">
								{t("goals.estimate.roughDescription")}
							</Text>
						)}
						{main.unit !== "overCap" && completion.estimatedDate && (
							<Text className="text-muted-foreground text-xs">
								{t("goals.estimate.estimatedDate", {
									date: formatMonth(completion.estimatedDate),
								})}
							</Text>
						)}
						{range && range[0] !== range[1] && (
							<Text className="text-muted-foreground text-xs">
								{t("goals.estimate.range", { min: range[0], max: range[1] })}
							</Text>
						)}
						<Text className="text-muted-foreground text-xs">
							{pace.source === "real"
								? t("goals.estimate.basedOnSavings", {
										amount: format(pace.realMonthly ?? 0),
									})
								: t("goals.estimate.basedOnSurplus", {
										percent: goal.allocationPercent,
										amount: format(estimate.surplusMonthly ?? 0),
									})}
						</Text>
					</View>
				)
			)}

			{pace.showInsight && (
				<View className="flex flex-row gap-2 rounded-md bg-muted/50 px-3 py-2">
					<IconComp
						as={LightbulbIcon}
						className="mt-0.5 size-3.5 shrink-0 text-amber-500"
					/>
					<Text className="flex-1 text-xs">
						{t("goals.insight.potential", {
							amount: format(pace.potentialMonthly ?? 0),
						})}
					</Text>
				</View>
			)}

			{targetDateGap && goal.targetDate !== null && (
				<GoalTargetDate
					date={formatDate(goal.targetDate)}
					gap={targetDateGap}
					format={format}
				/>
			)}
		</View>
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
			<Text className="text-destructive text-xs">
				{t("goals.targetDate.past", { date })}
			</Text>
		);

	if (gap.onTrack)
		return (
			<Text className="text-emerald-600 text-xs dark:text-emerald-400">
				{t("goals.targetDate.onTrack", { date })}
			</Text>
		);

	return (
		<View className="flex flex-col">
			<Text className="text-muted-foreground text-xs">
				{t("goals.targetDate.label", { date })}
			</Text>
			<Text className="text-amber-600 text-xs dark:text-amber-400">
				{t("goals.targetDate.behind", {
					amount: format(gap.requiredMonthly ?? 0),
					gap: format(gap.gap ?? 0),
				})}
			</Text>
		</View>
	);
}
