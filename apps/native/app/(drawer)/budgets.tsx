import type { BudgetWithSpent } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Container } from "@/components/container";
import CreateBudgetDialog from "@/components/form/create-budget-dialog";
import EditBudgetDialog from "@/components/form/edit-budget-dialog";
import { ICON_MAP } from "@/components/form/icon-picker";
import { Button } from "@/components/ui/button";
import { Icon as IconComp } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { formatCurrency, getCurrentMonthRange } from "@/lib/utils";

export default function Budgets() {
	const { t } = useTranslation();

	const { state, openModal, closeModal } = useModalState({
		createBudget: false,
		editBudget: false,
		deleteBudget: false,
	});

	const [selected, setSelected] = useState<BudgetWithSpent | null>(null);
	const { from, to } = getCurrentMonthRange();

	const { data: budgets = [], isLoading } = useQuery(
		trpc.budget.listWithSpent.queryOptions({ from, to }),
	);

	const deleteMutation = useMutation(
		trpc.budget.delete.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.budget.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.budget.listWithSpent.queryOptions({ from, to }),
					),
				]);
				globalSuccessToast(t("budgets.toast.deleted"));
				closeModal("deleteBudget");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					t("budgets.toast.deleteFailed", { message: error.message }),
				);
			},
		}),
	);

	function handleEdit(budget: BudgetWithSpent) {
		setSelected(budget);
		openModal("editBudget");
	}

	function handleDelete(budget: BudgetWithSpent) {
		setSelected(budget);
		openModal("deleteBudget");
	}

	return (
		<Container>
			<View className="flex flex-col gap-6 px-6 py-3">
				<View className="flex flex-row items-center justify-between">
					<View>
						<Text className="font-semibold text-xl">{t("budgets.title")}</Text>
						{isLoading ? (
							<Skeleton className="mt-1 h-4 w-24" />
						) : (
							<Text className="text-muted-foreground text-sm">
								{t("budgets.budgetCount", { count: budgets.length })}
							</Text>
						)}
					</View>
					<Button onPress={() => openModal("createBudget")}>
						<Text>{t("budgets.addBudget")}</Text>
					</Button>
				</View>

				<View className="flex flex-col gap-3">
					{budgets.map((budget) => {
						const Icon = budget.category?.icon
							? ICON_MAP[budget.category.icon]
							: null;
						const percent =
							budget.amount > 0
								? Math.min((budget.spent / budget.amount) * 100, 100)
								: 0;

						return (
							<View
								key={budget.id}
								className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
							>
								{/* Top row: icon + name + actions */}
								<View className="flex flex-row items-center gap-3">
									{Icon ? (
										<IconComp
											as={Icon}
											className="size-4 shrink-0"
											color={budget.category?.color ?? "#94a3b8"}
										/>
									) : (
										<View
											className="size-3 shrink-0 rounded-full"
											style={{
												backgroundColor: budget.category?.color ?? "#94a3b8",
											}}
										/>
									)}
									<Text className="min-w-0 flex-1 truncate font-medium text-sm">
										{budget.category?.name ?? "—"}
									</Text>
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											onPress={() => handleEdit(budget)}
										>
											<IconComp as={PencilIcon} className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive"
											onPress={() => handleDelete(budget)}
										>
											<IconComp
												as={Trash2Icon}
												className="size-3.5 text-destructive"
											/>
										</Button>
									</View>
								</View>

								{/* Second row: period + over-budget badge */}
								<View className="flex flex-row items-center gap-2">
									<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
										{budget.period === "monthly"
											? t("budgets.monthly")
											: t("budgets.weekly")}
									</Text>
									{budget.isOverBudget && (
										<Text className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive text-xs">
											{t("budgets.overBudget")}
										</Text>
									)}
								</View>

								{/* Progress section */}
								<View className="flex flex-col gap-1.5">
									<View className="flex justify-between text-muted-foreground text-xs">
										<Text>
											{t("budgets.spent")}: {formatCurrency(budget.spent)}
										</Text>
										<Text>{formatCurrency(budget.amount)}</Text>
									</View>
									<View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<View
											className={`h-full rounded-full transition-all ${
												budget.isOverBudget ? "bg-destructive" : "bg-primary"
											}`}
											style={{ width: `${percent}%` }}
										/>
									</View>
									<Text
										className={`text-xs ${
											budget.isOverBudget
												? "text-destructive"
												: "text-muted-foreground"
										}`}
									>
										{budget.isOverBudget
											? t("budgets.overBy", {
													amount: formatCurrency(Math.abs(budget.remaining)),
												})
											: t("budgets.remaining", {
													amount: formatCurrency(budget.remaining),
												})}
									</Text>
								</View>
							</View>
						);
					})}

					{/* Loading skeletons */}
					{isLoading &&
						[...Array(3)].map((_) => (
							<View
								key={createId()}
								className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3"
							>
								{/* Top row: icon + name + actions */}
								<View className="flex flex-row items-center gap-3">
									<Skeleton className="size-4 shrink-0 rounded-full" />
									<Skeleton className="h-4 w-32 min-w-0 flex-1" />
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Skeleton className="size-3.5" />
										<Skeleton className="size-3.5" />
									</View>
								</View>

								{/* Second row: period + over-budget badge */}
								<View className="flex flex-row items-center gap-2">
									<Skeleton className="h-5 w-20 rounded-full" />
									<Skeleton className="h-5 w-12 rounded-full" />
								</View>

								{/* Progress section */}
								<View className="flex flex-col gap-1.5">
									<View className="flex justify-between gap-2 text-muted-foreground text-xs">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-24" />
									</View>
									<View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<Skeleton className="h-full w-full rounded-full" />
									</View>
									<Text className="text-muted-foreground text-xs">
										<Skeleton className="h-4 w-32" />
									</Text>
								</View>
							</View>
						))}

					{/* Empty state */}
					{budgets.length === 0 && !isLoading && (
						<Text className="py-6 text-center text-muted-foreground text-sm">
							{t("budgets.noBudgets")}
						</Text>
					)}
				</View>

				<CreateBudgetDialog
					open={state.createBudget}
					setIsOpen={(open) =>
						open ? openModal("createBudget") : closeModal("createBudget")
					}
					from={from}
					to={to}
				/>

				<EditBudgetDialog
					open={state.editBudget}
					setIsOpen={(open) =>
						open ? openModal("editBudget") : closeModal("editBudget")
					}
					budget={selected}
					from={from}
					to={to}
				/>

				<ConfirmationDialog
					open={state.deleteBudget}
					onOpenChange={(open) =>
						open ? openModal("deleteBudget") : closeModal("deleteBudget")
					}
					title={t("budgets.delete.title")}
					description={t("budgets.delete.description", {
						name: selected?.category?.name,
					})}
					confirmText={t("budgets.delete.confirm")}
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
