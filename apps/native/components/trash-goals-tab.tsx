import { formatCurrency } from "@finance-tracker/utils";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RotateCcw, Trash2Icon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useGoalErrorMessage } from "@/hooks/use-goal";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { ConfirmationDialog } from "./confirmation-dialog";
import { ICON_MAP } from "./form/icon-picker";
import { Button } from "./ui/button";
import { Icon as IconComp } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

const SKELETON_KEYS = ["first", "second", "third"];

export function TrashGoals() {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();

	const { state, openModal, closeModal } = useModalState({
		permanentDelete: false,
		emptyTrash: false,
	});

	const [selected, setSelected] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const { data: goals = [], isLoading } = useQuery(
		trpc.goal.listDeleted.queryOptions(),
	);

	// Restoring brings a goal back to the goals screen, so refresh every goal query
	const invalidateGoals = () =>
		queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() });

	const restoreMutation = useMutation(
		trpc.goal.restore.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(
					t("trash.toast.restored", { name: t("trash.goals") }),
				);
			},
			onError: (err) =>
				globalErrorToast(
					goalErrorMessage(err, (message) =>
						t("trash.toast.restoreFailed", {
							name: t("trash.goals"),
							message,
						}),
					),
				),
		}),
	);

	const permanentDeleteMutation = useMutation(
		trpc.goal.permanentDelete.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", { name: t("trash.goals") }),
				);
				closeModal("permanentDelete");
				setSelected(null);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.goals"),
						message: err.message,
					}),
				),
		}),
	);

	const emptyTrashMutation = useMutation(
		trpc.goal.emptyTrash.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", { name: t("trash.goals") }),
				);
				closeModal("emptyTrash");
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.goals"),
						message: err.message,
					}),
				),
		}),
	);

	const isPending =
		restoreMutation.isPending || permanentDeleteMutation.isPending;

	const ListEmpty = isLoading ? (
		<View className="flex flex-col gap-3">
			{SKELETON_KEYS.map((key) => (
				<View
					key={key}
					className="flex flex-col justify-between gap-3 rounded-lg border border-border px-4 py-3"
				>
					<View className="flex flex-row items-center gap-3">
						<Skeleton className="size-4 shrink-0 rounded-full" />
						<View className="flex flex-1 flex-col gap-1">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-20" />
						</View>
						<Skeleton className="h-5 w-16 rounded-full" />
					</View>
					<View className="flex flex-row justify-end gap-1">
						<Skeleton className="h-7 w-20" />
						<Skeleton className="h-7 w-28" />
					</View>
				</View>
			))}
		</View>
	) : (
		<View className="flex flex-col items-center py-12">
			<Text className="text-muted-foreground text-sm">
				{t("trash.noItems")}
			</Text>
		</View>
	);

	return (
		<View className="flex flex-col gap-3 pt-3">
			<View className="flex flex-row justify-end">
				<Button
					variant="destructive"
					size="sm"
					disabled={emptyTrashMutation.isPending || goals.length === 0}
					onPress={() => openModal("emptyTrash")}
				>
					<IconComp as={Trash2Icon} className="size-4" />
					<Text className="text-white">{t("trash.emptyTrash")}</Text>
				</Button>
			</View>

			<FlashList
				data={goals}
				keyExtractor={(item) => item.id}
				scrollEnabled={false}
				ListEmptyComponent={ListEmpty}
				ItemSeparatorComponent={() => <View className="h-3" />}
				renderItem={({ item: goal }) => {
					const Icon = ICON_MAP[goal.icon];
					return (
						<View className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
							<View className="flex flex-row items-center gap-3">
								{Icon ? (
									<IconComp
										as={Icon}
										className="size-4 shrink-0"
										color={goal.color}
									/>
								) : (
									<View
										className="size-3 shrink-0 rounded-full"
										style={{ backgroundColor: goal.color }}
									/>
								)}
								<View className="flex flex-1 flex-col">
									<Text className="font-medium text-sm">{goal.name}</Text>
									<Text className="text-muted-foreground text-xs">
										{formatCurrency(goal.targetAmount, goal.currency)}
									</Text>
								</View>
								<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
									{t(`goals.status.${goal.status}`)}
								</Text>
							</View>
							<View className="flex flex-row items-center justify-end gap-1">
								<Button
									variant="ghost"
									size="sm"
									disabled={isPending}
									onPress={() => restoreMutation.mutate({ id: goal.id })}
								>
									<IconComp as={RotateCcw} className="size-3.5" />
									<Text className="text-xs">{t("trash.restore")}</Text>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="text-destructive"
									disabled={isPending}
									onPress={() => {
										setSelected({ id: goal.id, name: goal.name });
										openModal("permanentDelete");
									}}
								>
									<IconComp
										as={Trash2Icon}
										className="size-3.5 text-destructive"
									/>
									<Text className="text-destructive text-xs">
										{t("trash.permanentDelete")}
									</Text>
								</Button>
							</View>
						</View>
					);
				}}
			/>

			<ConfirmationDialog
				open={state.permanentDelete}
				onOpenChange={(open) =>
					open ? openModal("permanentDelete") : closeModal("permanentDelete")
				}
				title={t("trash.permanentDelete")}
				description={t("trash.toast.confirmPermanentDelete", {
					name: selected?.name ?? t("trash.goals"),
				})}
				confirmText={t("trash.permanentDelete")}
				variant="destructive"
				isLoading={permanentDeleteMutation.isPending}
				onConfirm={() => {
					if (selected) permanentDeleteMutation.mutate({ id: selected.id });
				}}
			/>

			<ConfirmationDialog
				open={state.emptyTrash}
				onOpenChange={(open) =>
					open ? openModal("emptyTrash") : closeModal("emptyTrash")
				}
				title={t("trash.emptyTrash")}
				description={t("trash.toast.confirmEmptyTrash")}
				confirmText={t("trash.emptyTrash")}
				variant="destructive"
				isLoading={emptyTrashMutation.isPending}
				onConfirm={() => emptyTrashMutation.mutate()}
			/>
		</View>
	);
}
