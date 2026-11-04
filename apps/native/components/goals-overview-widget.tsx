import { formatCurrency } from "@finance-tracker/utils";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { PiggyBank } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { useGoalText } from "@/hooks/use-goal";
import { trpc } from "@/lib/trpc";
import { ICON_MAP } from "./form/icon-picker";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Icon } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

const MAX_GOALS = 3;
const SKELETON_KEYS = ["first", "second"];

/** The top-priority active goals with their progress and time left. */
export function GoalsOverviewWidget() {
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
				<View className="flex-row items-center justify-between">
					<CardTitle className="text-base">{t("goals.widget.title")}</CardTitle>
					{isPending ? (
						<Skeleton className="h-3.5 w-12" />
					) : activeGoals.length > 0 ? (
						<Pressable onPress={() => router.push("/goals")} hitSlop={8}>
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
						{SKELETON_KEYS.map((key) => (
							<View key={key} className="gap-1.5">
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
						<Icon as={PiggyBank} className="size-8 text-muted-foreground/40" />
						<Text className="text-center text-muted-foreground text-sm">
							{t("goals.widget.noGoals")}
						</Text>
						<Pressable onPress={() => router.push("/goals")} hitSlop={8}>
							<Text className="text-primary text-xs">
								{t("goals.addGoal")} →
							</Text>
						</Pressable>
					</View>
				) : (
					<View className="gap-3">
						{displayed.map(({ goal, progress, estimate }) => {
							const GoalIcon = ICON_MAP[goal.icon];
							const percent =
								goal.targetAmount > 0
									? Math.min((progress.total / goal.targetAmount) * 100, 100)
									: 0;
							const main =
								estimate?.completion.status === "estimated"
									? estimate.duration.main
									: null;

							return (
								<Pressable
									key={goal.id}
									onPress={() => router.push("/goals")}
									className="gap-1.5"
								>
									<View className="flex-row items-center justify-between gap-2">
										<View className="min-w-0 flex-1 flex-row items-center gap-2">
											{GoalIcon && <GoalIcon size={14} color={goal.color} />}
											<Text
												className="shrink font-medium text-foreground text-sm"
												numberOfLines={1}
											>
												{goal.name}
											</Text>
											{progress.isReached && (
												<Badge>
													<Text>{t("goals.status.reached")}</Text>
												</Badge>
											)}
										</View>
										<Text className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{formatCurrency(progress.total, goal.currency)} /{" "}
											{formatCurrency(goal.targetAmount, goal.currency)}
										</Text>
									</View>
									<View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<View
											className="h-full rounded-full"
											style={{
												width: `${percent}%`,
												backgroundColor: goal.color,
											}}
										/>
									</View>
									{!progress.isReached && main && (
										<Text className="text-muted-foreground text-xs">
											{timeLeft(main)}
										</Text>
									)}
								</Pressable>
							);
						})}

						{activeGoals.length > MAX_GOALS && (
							<Pressable
								onPress={() => router.push("/goals")}
								className="items-center pt-1"
								hitSlop={8}
							>
								<Text className="text-center text-muted-foreground text-xs">
									+{activeGoals.length - MAX_GOALS} {t("common.more")} ·{" "}
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
