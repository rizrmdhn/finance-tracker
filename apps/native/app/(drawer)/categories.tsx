import type { Category } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Container } from "@/components/container";
import CreateCategoryDialog from "@/components/form/create-category-dialog";
import EditCategoryDialog from "@/components/form/edit-category-dialog";
import { ICON_MAP } from "@/components/form/icon-picker";
import { Button } from "@/components/ui/button";
import { Icon as IconComp } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

export default function Categories() {
	const { t } = useTranslation();

	const { state, openModal, closeModal } = useModalState({
		createCategory: false,
		editCategory: false,
		deleteCategory: false,
	});

	const [selected, setSelected] = useState<Category | null>(null);

	const {
		data: categories = [],
		isLoading,
		isRefetching,
		refetch,
	} = useQuery(trpc.category.list.queryOptions());

	const seedDefaultsMutation = useMutation(
		trpc.category.seedDefaults.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.category.list.queryOptions());
				globalSuccessToast(t("categories.toast.defaultsLoaded"));
			},
			onError: (error) => {
				globalErrorToast(
					t("categories.toast.defaultsLoadFailed", { message: error.message }),
				);
			},
		}),
	);

	const deleteMutation = useMutation(
		trpc.category.delete.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
				queryClient.invalidateQueries(trpc.category.list.queryOptions()),
				queryClient.invalidateQueries(trpc.category.listDeleted.queryOptions()),
			]);
				globalSuccessToast(t("categories.toast.deleted"));
				closeModal("deleteCategory");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					t("categories.toast.deleteFailed", { message: error.message }),
				);
			},
		}),
	);

	function handleEdit(category: Category) {
		setSelected(category);
		openModal("editCategory");
	}

	function handleDelete(category: Category) {
		setSelected(category);
		openModal("deleteCategory");
	}

	return (
		<Container onRefresh={refetch} refreshing={isRefetching}>
			<View className="flex flex-col gap-6 px-6 py-3">
				<View className="flex flex-row items-center justify-between">
					<View>
						<Text className="font-semibold text-xl">
							{t("categories.title")}
						</Text>
						{isLoading ? (
							<Skeleton className="mt-1 h-4 w-24" />
						) : (
							<Text className="text-muted-foreground text-sm">
								{t("categories.categoryCount", { count: categories.length })}
							</Text>
						)}
					</View>
					<Button onPress={() => openModal("createCategory")}>
						<Text>{t("categories.addCategory")}</Text>
					</Button>
				</View>

				<View className="flex flex-col gap-3">
					{categories.map((category) => {
						const Icon = category.icon ? ICON_MAP[category.icon] : null;
						return (
							<View
								key={category.id}
								className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
							>
								{/* Top row: icon + name + actions */}
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
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											onPress={() => handleEdit(category)}
										>
											<IconComp as={PencilIcon} className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive"
											onPress={() => handleDelete(category)}
										>
											<IconComp
												as={Trash2Icon}
												className="size-3.5 text-destructive"
											/>
										</Button>
									</View>
								</View>

								{/* Second row: category description */}
								<View className="flex flex-row items-center gap-2">
									<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
										{category.type}
									</Text>
								</View>
							</View>
						);
					})}
					{isLoading &&
						[...Array(3)].map((_, _i) => (
							<View
								key={createId()}
								className="flex flex-col justify-between gap-3 rounded-lg border border-border px-4 py-3"
							>
								<View className="flex flex-row items-center gap-3">
									<Skeleton className="size-4 shrink-0 rounded-full" />
									<Skeleton className="h-4 w-32 flex-1" />
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Skeleton className="size-3.5" />
										<Skeleton className="size-3.5" />
									</View>
								</View>

								{/* Second row: category description */}
								<View className="flex flex-row items-center gap-2">
									<Skeleton className="h-5 w-20 rounded-full" />
								</View>
							</View>
						))}
					{categories.length === 0 && !isLoading && (
						<View className="flex flex-col items-center gap-3 py-8 text-center">
							<Text className="text-muted-foreground text-sm">
								{t("categories.noCategories")}
							</Text>
							<Button
								variant="outline"
								size="sm"
								disabled={seedDefaultsMutation.isPending}
								onPress={() => seedDefaultsMutation.mutate()}
							>
								{seedDefaultsMutation.isPending && <Spinner />}
								<Text>{t("categories.loadDefaults")}</Text>
							</Button>
						</View>
					)}
				</View>

				<CreateCategoryDialog
					open={state.createCategory}
					setIsOpen={(open) =>
						open ? openModal("createCategory") : closeModal("createCategory")
					}
				/>

				<EditCategoryDialog
					open={state.editCategory}
					setIsOpen={(open) =>
						open ? openModal("editCategory") : closeModal("editCategory")
					}
					category={selected}
				/>

				<ConfirmationDialog
					open={state.deleteCategory}
					onOpenChange={(open) =>
						open ? openModal("deleteCategory") : closeModal("deleteCategory")
					}
					title={t("categories.delete.title")}
					description={t("categories.delete.description", {
						name: selected?.name,
					})}
					confirmText={t("categories.delete.confirm")}
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
