import type { Transaction } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RotateCcw, Trash2Icon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Button } from "./ui/button";
import { Icon as IconComp } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

export function TrashTransactions() {
	const { t } = useTranslation();
	const { format } = useFormatCurrency();

	const { state, openModal, closeModal } = useModalState({
		permanentDelete: false,
		emptyTrash: false,
	});

	const [selected, setSelected] = useState<Transaction | null>(null);

	const {
		data: transactions = [],
		isLoading,
		refetch,
		isRefetching,
	} = useQuery(trpc.transaction.listDeleted.queryOptions());

	const restoreMutation = useMutation(
		trpc.transaction.restore.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.transaction.listDeleted.queryOptions(),
				);
				globalSuccessToast(
					t("trash.toast.restored", { name: t("trash.transactions") }),
				);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.restoreFailed", {
						name: t("trash.transactions"),
						message: err.message,
					}),
				),
		}),
	);

	const permanentDeleteMutation = useMutation(
		trpc.transaction.permanentDelete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.transaction.listDeleted.queryOptions(),
				);
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", {
						name: t("trash.transactions"),
					}),
				);
				closeModal("permanentDelete");
				setSelected(null);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.transactions"),
						message: err.message,
					}),
				),
		}),
	);

	const emptyTrashMutation = useMutation(
		trpc.transaction.emptyTrash.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.transaction.listDeleted.queryOptions(),
				);
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", {
						name: t("trash.transactions"),
					}),
				);
				closeModal("emptyTrash");
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.transactions"),
						message: err.message,
					}),
				),
		}),
	);

	const isPending =
		restoreMutation.isPending || permanentDeleteMutation.isPending;

	const ListEmpty = isLoading ? (
		<View className="flex flex-col gap-3">
			{[...Array(4)].map((_) => (
				<View
					key={createId()}
					className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3"
				>
					<View className="flex flex-row items-center gap-3">
						<View className="flex min-w-0 flex-1 flex-col gap-1">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-20" />
						</View>
						<Skeleton className="h-4 w-16 shrink-0" />
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
			<Text className="text-muted-foreground text-sm">{t("trash.noItems")}</Text>
		</View>
	);

	const ListFooter = isRefetching ? (
		<View className="flex items-center py-4">
			<ActivityIndicator />
		</View>
	) : null;

	return (
		<View className="flex flex-col gap-3 pt-3">
			<View className="flex flex-row justify-end">
				<Button
					variant="destructive"
					size="sm"
					disabled={emptyTrashMutation.isPending || transactions.length === 0}
					onPress={() => openModal("emptyTrash")}
				>
					<IconComp as={Trash2Icon} className="size-4" />
					<Text className="text-white">{t("trash.emptyTrash")}</Text>
				</Button>
			</View>

			<FlashList
				data={transactions}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={ListEmpty}
				ListFooterComponent={ListFooter}
				onRefresh={refetch}
				refreshing={isRefetching && !isLoading}
				renderItem={({ item: tx }) => (
					<View className="mb-3 flex flex-col gap-2 rounded-lg border border-border px-4 py-3">
						<View className="flex flex-row items-center gap-3">
							<View className="flex min-w-0 flex-1 flex-col">
								<Text className="truncate font-medium text-sm">
									{tx.note ?? "—"}
								</Text>
								<Text className="text-muted-foreground text-xs">
									{tx.deletedAt
										? formatDate(new Date(tx.deletedAt).getTime())
										: "—"}
								</Text>
							</View>
							<Text className="shrink-0 font-medium text-sm">
								{format(tx.amount)}
							</Text>
						</View>
						<View className="flex flex-row items-center justify-end gap-1">
							<Button
								variant="ghost"
								size="sm"
								disabled={isPending}
								onPress={() => restoreMutation.mutate({ id: tx.id })}
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
									setSelected(tx);
									openModal("permanentDelete");
								}}
							>
								<IconComp as={Trash2Icon} className="size-3.5 text-destructive" />
								<Text className="text-destructive text-xs">
									{t("trash.permanentDelete")}
								</Text>
							</Button>
						</View>
					</View>
				)}
			/>

			<ConfirmationDialog
				open={state.permanentDelete}
				onOpenChange={(open) =>
					open ? openModal("permanentDelete") : closeModal("permanentDelete")
				}
				title={t("trash.permanentDelete")}
				description={t("trash.toast.confirmPermanentDelete", {
					name: selected?.note ?? t("trash.transactions"),
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
