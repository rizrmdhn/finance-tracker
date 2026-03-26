import { REUCRRENCE_FREQUENCY_LABELS } from "@finance-tracker/constants";
import type { RecurrenceWithTemplate } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PauseIcon, PencilIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ICON_MAP } from "@/components/icon-picker";
import useModalState from "@/hooks/use-modal-state";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import EditRecurrenceDialog from "./-components/edit-recurrence-dialog";
import { formatCurrency, formatDate } from "./-components/utils";

export const Route = createFileRoute("/recurring")({
	component: RecurringComponent,
	head: () =>
		pageHead(
			"Recurring Transactions",
			"Manage your automated recurring transactions.",
		),
});

function RecurringComponent() {
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
				await queryClient.invalidateQueries(trpc.recurrence.list.queryOptions());
				globalSuccessToast(
					data.isActive
						? t("recurrences.toast.resumed")
						: t("recurrences.toast.paused"),
				);
			},
			onError: (error) => {
				globalErrorToast(
					t("recurrences.toast.toggleFailed", { message: error.message }),
				);
			},
		}),
	);

	const deleteMutation = useMutation(
		trpc.recurrence.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.recurrence.list.queryOptions());
				globalSuccessToast(t("recurrences.toast.deleted"));
				closeModal("deleteRecurrence");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					t("recurrences.toast.deleteFailed", { message: error.message }),
				);
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
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">{t("recurrences.title")}</h1>
					{isLoading ? (
						<Skeleton className="mt-1 h-4 w-24" />
					) : (
						<p className="text-muted-foreground text-sm">
							{t("recurrences.ruleCount", { count: recurrences.length })}
						</p>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{recurrences.map((rule) => {
					const Icon = rule.templateTransaction.category?.icon
						? ICON_MAP[rule.templateTransaction.category.icon]
						: null;

					return (
						<div
							key={rule.id}
							className="flex items-center gap-3 rounded-lg border px-4 py-3"
						>
							{/* Category icon */}
							{Icon ? (
								<Icon
									className="size-4 shrink-0"
									style={{
										color:
											rule.templateTransaction.category?.color ?? "#94a3b8",
									}}
								/>
							) : (
								<div
									className="size-3 shrink-0 rounded-full"
									style={{
										backgroundColor:
											rule.templateTransaction.category?.color ?? "#94a3b8",
									}}
								/>
							)}

							{/* Name + account */}
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate font-medium text-sm">
									{rule.templateTransaction.category?.name ?? "—"}
								</span>
								<span className="text-muted-foreground text-xs">
									{rule.templateTransaction.account?.name ?? "—"}
								</span>
							</div>

							{/* Amount */}
							<span className="shrink-0 font-medium text-sm">
								{formatCurrency(rule.templateTransaction.amount)}
							</span>

							{/* Frequency badge */}
							<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
								{REUCRRENCE_FREQUENCY_LABELS[rule.frequency as keyof typeof REUCRRENCE_FREQUENCY_LABELS]}
							</span>

							{/* Next run */}
							<span className="shrink-0 text-muted-foreground text-xs">
								{t("recurrences.nextRun")}: {formatDate(rule.nextRunAt)}
							</span>

							{/* Active / paused badge */}
							{rule.isActive ? (
								<span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-600 text-xs dark:text-green-400">
									{t("recurrences.active")}
								</span>
							) : (
								<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
									{t("recurrences.paused")}
								</span>
							)}

							{/* Actions */}
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleEdit(rule)}
									title={t("common.edit")}
								>
									<PencilIcon className="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => toggleMutation.mutate({ id: rule.id })}
									disabled={toggleMutation.isPending}
									title={rule.isActive ? t("recurrences.pause") : t("recurrences.resume")}
								>
									{rule.isActive ? (
										<PauseIcon className="size-3.5" />
									) : (
										<PlayIcon className="size-3.5" />
									)}
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-destructive hover:text-destructive"
									onClick={() => handleDelete(rule)}
									title={t("common.delete")}
								>
									<Trash2Icon className="size-3.5" />
								</Button>
							</div>
						</div>
					);
				})}

				{/* Loading skeletons */}
				{isLoading &&
					[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-3 rounded-lg border px-4 py-3"
						>
							<Skeleton className="size-4 shrink-0 rounded-full" />
							<div className="flex flex-1 flex-col gap-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-5 w-14 rounded-full" />
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-5 w-12 rounded-full" />
							<Skeleton className="size-7" />
							<Skeleton className="size-7" />
							<Skeleton className="size-7" />
						</div>
					))}

				{/* Empty state */}
				{recurrences.length === 0 && !isLoading && (
					<p className="py-6 text-center text-muted-foreground text-sm">
						{t("recurrences.noRules")}
					</p>
				)}
			</div>

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
					open ? openModal("deleteRecurrence") : closeModal("deleteRecurrence")
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
		</div>
	);
}
