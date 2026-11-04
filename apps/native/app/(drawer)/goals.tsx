import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { ChevronRightIcon, PiggyBankIcon, PlusIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Container } from "@/components/container";
import CreateGoalDialog from "@/components/form/create-goal-dialog";
import { GoalCard } from "@/components/goal-card";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import useModalState from "@/hooks/use-modal-state";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const SKELETON_KEYS = ["first", "second", "third"];

export default function Goals() {
	const { t } = useTranslation();
	const { state, openModal, closeModal } = useModalState({
		createGoal: false,
	});
	const [showInactive, setShowInactive] = useState(false);

	// In list order: priority, then creation date
	const {
		data: overview = [],
		isLoading,
		isRefetching,
		refetch,
	} = useQuery(trpc.goal.overview.queryOptions());

	// Balances and estimates change with transactions made elsewhere
	useFocusEffect(
		useCallback(() => {
			refetch();
		}, [refetch]),
	);

	const activeGoals = overview.filter((item) => item.goal.status === "active");
	const inactiveGoals = overview.filter(
		(item) => item.goal.status !== "active",
	);

	return (
		<Container onRefresh={refetch} refreshing={isRefetching}>
			<View className="flex flex-col gap-6 px-6 py-3">
				<View className="flex flex-row items-center justify-between gap-4">
					<View className="flex-1">
						<Text className="font-semibold text-xl">{t("goals.title")}</Text>
						{isLoading ? (
							<Skeleton className="mt-1 h-4 w-24" />
						) : (
							<Text className="text-muted-foreground text-sm">
								{t("goals.goalCount", { count: activeGoals.length })}
							</Text>
						)}
					</View>
					<Button onPress={() => openModal("createGoal")}>
						<Text>{t("goals.addGoal")}</Text>
					</Button>
				</View>

				{isLoading && (
					<View className="flex flex-col gap-3">
						{SKELETON_KEYS.map((key) => (
							<View
								key={key}
								className="flex flex-col gap-4 rounded-lg border border-border px-4 py-3"
							>
								<View className="flex flex-row items-center gap-3">
									<Skeleton className="size-9 shrink-0 rounded-full" />
									<Skeleton className="h-4 flex-1" />
									<Skeleton className="h-5 w-14 rounded-full" />
								</View>
								<View className="flex flex-col gap-1.5">
									<Skeleton className="h-3 w-40" />
									<Skeleton className="h-2 w-full rounded-full" />
									<Skeleton className="h-3 w-24" />
								</View>
							</View>
						))}
					</View>
				)}

				{!isLoading && activeGoals.length === 0 && (
					<View className="items-center gap-2 rounded-lg border border-border px-6 py-8">
						<Icon as={PiggyBankIcon} className="size-8 text-muted-foreground" />
						<Text className="font-medium text-base">{t("goals.noGoals")}</Text>
						<Text className="text-center text-muted-foreground text-sm">
							{t("goals.noGoalsDescription")}
						</Text>
						<Button
							variant="outline"
							className="mt-2"
							onPress={() => openModal("createGoal")}
						>
							<Icon as={PlusIcon} className="size-4" />
							<Text>{t("goals.addGoal")}</Text>
						</Button>
					</View>
				)}

				{activeGoals.length > 0 && (
					<View className="flex flex-col gap-3">
						{activeGoals.map((item) => (
							<GoalCard key={item.goal.id} item={item} />
						))}
					</View>
				)}

				{inactiveGoals.length > 0 && (
					<Collapsible
						open={showInactive}
						onOpenChange={setShowInactive}
						className="flex flex-col gap-3"
					>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" className="self-start px-2">
								<Icon
									as={ChevronRightIcon}
									className={cn(
										"size-4 text-muted-foreground",
										showInactive && "rotate-90",
									)}
								/>
								<Text className="text-muted-foreground">
									{t("goals.inactiveGoals", { count: inactiveGoals.length })}
								</Text>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="flex flex-col gap-3">
							{inactiveGoals.map((item) => (
								<GoalCard key={item.goal.id} item={item} />
							))}
						</CollapsibleContent>
					</Collapsible>
				)}

				<CreateGoalDialog
					open={state.createGoal}
					setIsOpen={(open) =>
						open ? openModal("createGoal") : closeModal("createGoal")
					}
				/>
			</View>
		</Container>
	);
}
