import type { Category } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RotateCcw, Trash2Icon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { ConfirmationDialog } from "./confirmation-dialog";
import { ICON_MAP } from "./form/icon-picker";
import { Button } from "./ui/button";
import { Icon as IconComp } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

export function TrashCategories() {
	const { t } = useTranslation();

	const { state, openModal, closeModal } = useModalState({
		permanentDelete: false,
		emptyTrash: false,
	});

	const [selected, setSelected] = useState<Category | null>(null);

	const { data: categories = [], isLoading } = useQuery(
		trpc.category.listDeleted.queryOptions(),
	);

	const restoreMutation = useMutation(
		trpc.category.restore.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.category.listDeleted.queryOptions(),
				);
				globalSuccessToast(
					t("trash.toast.restored", { name: t("trash.categories") }),
				);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.restoreFailed", {
						name: t("trash.categories"),
						message: err.message,
					}),
				),
		}),
	);

	const permanentDeleteMutation = useMutation(
		trpc.category.permanentDelete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.category.listDeleted.queryOptions(),
				);
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", { name: t("trash.categories") }),
				);
				closeModal("permanentDelete");
				setSelected(null);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.categories"),
						message: err.message,
					}),
				),
		}),
	);

	const emptyTrashMutation = useMutation(
		trpc.category.emptyTrash.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.category.listDeleted.queryOptions(),
				);
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", { name: t("trash.categories") }),
				);
				closeModal("emptyTrash");
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.categories"),
						message: err.message,
					}),
				),
		}),
	);

	const isPending =
		restoreMutation.isPending || permanentDeleteMutation.isPending;

	const ListEmpty = isLoading ? (
		<View className="flex flex-col gap-3">
			{[...Array(3)].map((_) => (
				<View
					key={createId()}
					className="flex flex-col justify-between gap-3 rounded-lg border border-border px-4 py-3"
				>
					<View className="flex flex-row items-center gap-3">
						<Skeleton className="size-4 shrink-0 rounded-full" />
						<Skeleton className="h-4 w-32 flex-1" />
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
					disabled={emptyTrashMutation.isPending || categories.length === 0}
					onPress={() => openModal("emptyTrash")}
				>
					<IconComp as={Trash2Icon} className="size-4" />
					<Text className="text-white">{t("trash.emptyTrash")}</Text>
				</Button>
			</View>

			<FlashList
				data={categories}
				keyExtractor={(item) => item.id}
				scrollEnabled={false}
				ListEmptyComponent={ListEmpty}
				ItemSeparatorComponent={() => <View className="h-3" />}
				renderItem={({ item: category }) => {
					const Icon = category.icon ? ICON_MAP[category.icon] : null;
					return (
						<View className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
							<View className="flex flex-row items-center gap-3">
								{Icon ? (
									<IconComp
										as={Icon}
										className="size-4 shrink-0"
										color={category.color ?? "#94a3b8"}
									/>
								) : (
									<View
										className="size-3 shrink-0 rounded-full"
										style={{ backgroundColor: category.color ?? "#94a3b8" }}
									/>
								)}
								<Text className="flex-1 font-medium text-sm">
									{category.name}
								</Text>
								<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
									{category.type}
								</Text>
							</View>
							<View className="flex flex-row items-center justify-end gap-1">
								<Button
									variant="ghost"
									size="sm"
									disabled={isPending}
									onPress={() => restoreMutation.mutate({ id: category.id })}
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
										setSelected(category);
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
					name: selected?.name ?? t("trash.categories"),
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
