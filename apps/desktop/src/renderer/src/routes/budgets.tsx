import type { BudgetWithSpent } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ICON_MAP } from "@/components/icon-picker";
import useModalState from "@/hooks/use-modal-state";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import CreateBudgetDialog from "./-components/create-budget-dialog";
import EditBudgetDialog from "./-components/edit-budget-dialog";
import { getCurrentMonthRange } from "./-components/utils";

export const Route = createFileRoute("/budgets")({
	component: BudgetsComponent,
	head: () =>
		pageHead(
			"Budgets",
			"Set spending limits per category and track how much you've used.",
		),
});

function BudgetsComponent() {
	const { t } = useTranslation();
	const { format } = useFormatCurrency();
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
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">{t("budgets.title")}</h1>
					{isLoading ? (
						<Skeleton className="mt-1 h-4 w-24" />
					) : (
						<p className="text-muted-foreground text-sm">
							{t("budgets.budgetCount", { count: budgets.length })}
						</p>
					)}
				</div>
				<Button onClick={() => openModal("createBudget")}>
					{t("budgets.addBudget")}
				</Button>
			</div>

			<div className="flex flex-col gap-3">
				{budgets.map((budget) => {
					const Icon = budget.category?.icon
						? ICON_MAP[budget.category.icon]
						: null;
					const percent =
						budget.amount > 0
							? Math.min((budget.spent / budget.amount) * 100, 100)
							: 0;

					return (
						<div
							key={budget.id}
							className="flex flex-col gap-3 rounded-lg border px-4 py-3"
						>
							{/* Header row */}
							<div className="flex items-center gap-3">
								{Icon ? (
									<Icon
										className="size-4 shrink-0"
										style={{
											color: budget.category?.color ?? "#94a3b8",
										}}
									/>
								) : (
									<div
										className="size-3 shrink-0 rounded-full"
										style={{
											backgroundColor: budget.category?.color ?? "#94a3b8",
										}}
									/>
								)}
								<span className="flex-1 font-medium text-sm">
									{budget.category?.name ?? "—"}
								</span>
								<span className="text-muted-foreground text-xs capitalize">
									{budget.period === "monthly"
										? t("budgets.monthly")
										: t("budgets.weekly")}
								</span>
								{budget.isOverBudget && (
									<span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive text-xs">
										{t("budgets.overBudget")}
									</span>
								)}
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleEdit(budget)}
									>
										<PencilIcon className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive hover:text-destructive"
										onClick={() => handleDelete(budget)}
									>
										<Trash2Icon className="size-3.5" />
									</Button>
								</div>
							</div>

							{/* Progress section */}
							<div className="flex flex-col gap-1.5">
								<div className="flex justify-between text-muted-foreground text-xs">
									<span>
										{t("budgets.spent")}: {format(budget.spent)}
									</span>
									<span>{format(budget.amount)}</span>
								</div>
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										className={`h-full rounded-full transition-all ${
											budget.isOverBudget ? "bg-destructive" : "bg-primary"
										}`}
										style={{ width: `${percent}%` }}
									/>
								</div>
								<p
									className={`text-xs ${
										budget.isOverBudget
											? "text-destructive"
											: "text-muted-foreground"
									}`}
								>
									{budget.isOverBudget
										? t("budgets.overBy", {
												amount: format(Math.abs(budget.remaining)),
											})
										: t("budgets.remaining", {
												amount: format(budget.remaining),
											})}
								</p>
							</div>
						</div>
					);
				})}

				{/* Loading skeletons */}
				{isLoading &&
					[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="flex flex-col gap-3 rounded-lg border px-4 py-3"
						>
							<div className="flex items-center gap-3">
								<Skeleton className="size-4 shrink-0 rounded-full" />
								<Skeleton className="h-4 flex-1" />
								<Skeleton className="h-3 w-14" />
								<Skeleton className="size-7" />
								<Skeleton className="size-7" />
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex justify-between">
									<Skeleton className="h-3 w-24" />
									<Skeleton className="h-3 w-16" />
								</div>
								<Skeleton className="h-1.5 w-full rounded-full" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
					))}

				{/* Empty state */}
				{budgets.length === 0 && !isLoading && (
					<p className="py-6 text-center text-muted-foreground text-sm">
						{t("budgets.noBudgets")}
					</p>
				)}
			</div>

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
		</div>
	);
}
