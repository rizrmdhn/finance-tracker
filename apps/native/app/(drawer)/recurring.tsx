import { REUCRRENCE_FREQUENCY_LABELS } from "@finance-tracker/constants";
import type { RecurrenceWithTemplate } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	PauseIcon,
	PencilIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Container } from "@/components/container";
import EditRecurrenceDialog from "@/components/form/edit-recurrence-dialog";
import { ICON_MAP } from "@/components/form/icon-picker";
import { Button } from "@/components/ui/button";
import { Icon as IconComp } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Recurring() {
	const { t } = useTranslation();

	const { state, openModal, closeModal } = useModalState({
		editRecurrence: false,
		deleteRecurrence: false,
	});

	const [selected, setSelected] = useState<RecurrenceWithTemplate | null>(null);

	const { data: recurrences = [], isLoading } = useQuery(
		trpc.recurrence.list.queryOptions(),
	);

	const toggleMutation = useMutation(
		trpc.recurrence.toggle.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries(
					trpc.recurrence.list.queryOptions(),
				);
				globalSuccessToast(
					data.isActive
						? t("recurrences.toast.resumed")
						: t("recurrences.toast.paused"),
				);
			},
			onError: (error) => {
				globalErrorToast(error.message);
			},
		}),
	);

	const deleteMutation = useMutation(
		trpc.recurrence.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.recurrence.list.queryOptions(),
				);
				globalSuccessToast(t("recurrences.toast.deleted"));
				closeModal("deleteRecurrence");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(error.message);
			},
		}),
	);

	function handleEdit(rule: RecurrenceWithTemplate) {
		setSelected(rule);
		openModal("editRecurrence");
	}

	function handleDelete(rule: RecurrenceWithTemplate) {
		setSelected(rule);
		openModal("deleteRecurrence");
	}

	return (
		<Container>
			<View className="flex flex-col gap-6 px-6 py-3">
				<View className="flex flex-row items-center justify-between">
					<View>
						<Text className="font-semibold text-xl">
							{t("recurrences.title")}
						</Text>
						{isLoading ? (
							<Skeleton className="mt-1 h-4 w-24" />
						) : (
							<Text className="text-muted-foreground text-sm">
								{t("recurrences.ruleCount", { count: recurrences.length })}
							</Text>
						)}
					</View>
				</View>

				<View className="flex flex-col gap-3">
					{recurrences.map((rule) => {
						const Icon = rule.templateTransaction.category?.icon
							? ICON_MAP[rule.templateTransaction.category.icon]
							: null;
						return (
							<View
								key={rule.id}
								className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3"
							>
								{/* Top row: icon + name/account + amount */}
								<View className="flex flex-row items-center gap-3">
									{Icon ? (
										<IconComp
											as={Icon}
											className="size-4 shrink-0"
											color={
												rule.templateTransaction.category?.color ?? "#94a3b8"
											}
										/>
									) : (
										<View
											className="size-3 shrink-0 rounded-full"
											style={{
												backgroundColor:
													rule.templateTransaction.category?.color ?? "#94a3b8",
											}}
										/>
									)}

									<View className="flex min-w-0 flex-1 flex-col">
										<Text className="truncate font-medium text-sm">
											{rule.templateTransaction.category?.name ?? "—"}
										</Text>
										<Text className="text-muted-foreground text-xs">
											{rule.templateTransaction.account?.name ?? "—"}
										</Text>
									</View>

									<Text className="shrink-0 font-medium text-sm">
										{formatCurrency(rule.templateTransaction.amount)}
									</Text>
								</View>

								{/* Bottom row: badges + next run + actions */}
								<View className="flex flex-row items-center gap-2">
									{/* Frequency badge */}
									<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
										{
											REUCRRENCE_FREQUENCY_LABELS[
												rule.frequency as keyof typeof REUCRRENCE_FREQUENCY_LABELS
											]
										}
									</Text>

									{/* Active / paused badge */}
									{rule.isActive ? (
										<Text className="rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-600 text-xs dark:text-green-400">
											{t("recurrences.active")}
										</Text>
									) : (
										<Text className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
											{t("recurrences.paused")}
										</Text>
									)}

									{/* Next run */}
									<Text className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
										{t("recurrences.nextRun")}: {formatDate(rule.nextRunAt)}
									</Text>

									{/* Actions */}
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											onPress={() => handleEdit(rule)}
										>
											<IconComp as={PencilIcon} className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onPress={() => toggleMutation.mutate({ id: rule.id })}
											disabled={toggleMutation.isPending}
										>
											{rule.isActive ? (
												<IconComp as={PauseIcon} className="size-3.5" />
											) : (
												<IconComp as={PlayIcon} className="size-3.5" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive"
											onPress={() => handleDelete(rule)}
										>
											<IconComp
												as={Trash2Icon}
												className="size-3.5 text-destructive"
											/>
										</Button>
									</View>
								</View>
							</View>
						);
					})}
					{isLoading &&
						[...Array(3)].map((_) => (
							<View
								key={createId()}
								className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
							>
								{/* Top row: icon + name/account + amount */}
								<View className="flex flex-row items-center gap-3">
									<Skeleton className="size-4 shrink-0 rounded-full" />

									<View className="flex min-w-0 flex-1 flex-col">
										<Skeleton className="mb-1 h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</View>

									<Text className="shrink-0 font-medium text-sm">
										<Skeleton className="h-4 w-16" />
									</Text>
								</View>

								{/* Bottom row: badges + next run + actions */}
								<View className="flex flex-row items-center gap-2">
									<Skeleton className="h-5 w-20 rounded-full" />

									{/* Active / paused badge */}
									<Skeleton className="h-5 w-12 rounded-full" />

									{/* Next run */}
									<Skeleton className="h-4 w-32 min-w-0 flex-1" />

									{/* Actions */}
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Skeleton className="size-3.5" />
										<Skeleton className="size-3.5" />
										<Skeleton className="size-3.5" />
									</View>
								</View>
							</View>
						))}
					{recurrences.length === 0 && !isLoading && (
						<View className="flex flex-col items-center gap-3 py-8 text-center">
							<Text className="text-muted-foreground text-sm">
								{t("recurrences.noRules")}
							</Text>
						</View>
					)}
				</View>

				<EditRecurrenceDialog
					open={state.editRecurrence}
					setIsOpen={(open) =>
						open ? openModal("editRecurrence") : closeModal("editRecurrence")
					}
					recurrence={selected}
				/>

				<ConfirmationDialog
					open={state.deleteRecurrence}
					onOpenChange={(open) =>
						open
							? openModal("deleteRecurrence")
							: closeModal("deleteRecurrence")
					}
					title={t("recurrences.delete.title")}
					description={t("recurrences.delete.description", {
						name: selected?.templateTransaction.category?.name,
					})}
					confirmText={t("recurrences.delete.confirm")}
					variant="destructive"
					isLoading={deleteMutation.isPending}
					onConfirm={() => {
						if (selected) deleteMutation.mutate({ id: selected.id });
					}}
				/>
			</View>
		</Container>
	);
}
