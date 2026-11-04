import { Button } from "@finance-tracker/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@finance-tracker/ui/components/collapsible";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@finance-tracker/ui/components/empty";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import type { GoalContributionMode } from "@finance-tracker/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRightIcon, PiggyBankIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import useModalState from "@/hooks/use-modal-state";
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import CreateGoalDialog from "./-components/create-goal-dialog";
import EditGoalDialog from "./-components/edit-goal-dialog";
import GoalCard from "./-components/goal-card";
import GoalContributionDialog from "./-components/goal-contribution-dialog";
import GoalDetailDialog from "./-components/goal-detail-dialog";
import {
	type GoalOverviewItem,
	useGoalErrorMessage,
} from "./-components/goal-utils";
import PurchaseGoalDialog from "./-components/purchase-goal-dialog";

export const Route = createFileRoute("/goals")({
	component: GoalsComponent,
	head: () =>
		pageHead(
			"Goals",
			"Save toward the things you want and see when you'll reach them.",
		),
});

const GRID_CLASS = "grid gap-3 md:grid-cols-2 xl:grid-cols-3";

function GoalsComponent() {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();
	const { state, openModal, closeModal } = useModalState({
		createGoal: false,
		goalDetail: false,
		contribution: false,
		purchaseGoal: false,
		editGoal: false,
		archiveGoal: false,
		deleteGoal: false,
	});
	const [selected, setSelected] = useState<GoalOverviewItem | null>(null);
	const [contributionMode, setContributionMode] =
		useState<GoalContributionMode>("setAside");

	// In list order: priority, then creation date
	const { data: overview = [], isLoading } = useQuery(
		trpc.goal.overview.queryOptions(),
	);

	// The latest data of the selected goal, so open dialogs follow its changes
	const current =
		overview.find((item) => item.goal.id === selected?.goal.id) ?? selected;

	const activeGoals = overview.filter((item) => item.goal.status === "active");
	const inactiveGoals = overview.filter(
		(item) => item.goal.status !== "active",
	);

	const invalidateGoals = () =>
		queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() });

	const archiveMutation = useMutation(
		trpc.goal.archive.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(t("goals.toast.archived"));
				closeModal("archiveGoal");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.archiveFailed", { message }),
					),
				);
			},
		}),
	);

	const deleteMutation = useMutation(
		trpc.goal.delete.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(t("goals.toast.deleted"));
				closeModal("deleteGoal");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.deleteFailed", { message }),
					),
				);
			},
		}),
	);

	function openFor(
		modal:
			| "goalDetail"
			| "purchaseGoal"
			| "editGoal"
			| "archiveGoal"
			| "deleteGoal",
	) {
		return (item: GoalOverviewItem) => {
			setSelected(item);
			openModal(modal);
		};
	}

	function openContribution(mode: GoalContributionMode) {
		return (item: GoalOverviewItem) => {
			setSelected(item);
			setContributionMode(mode);
			openModal("contribution");
		};
	}

	const cardActions = {
		onOpenDetail: openFor("goalDetail"),
		onSetAside: openContribution("setAside"),
		onWithdraw: openContribution("withdraw"),
		onPurchase: openFor("purchaseGoal"),
		onEdit: openFor("editGoal"),
		onArchive: openFor("archiveGoal"),
		onDelete: openFor("deleteGoal"),
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="font-semibold text-xl">{t("goals.title")}</h1>
					<p className="max-w-2xl text-muted-foreground text-sm">
						{t("goals.description")}
					</p>
				</div>
				<Button onClick={() => openModal("createGoal")}>
					<PlusIcon />
					{t("goals.addGoal")}
				</Button>
			</div>

			{isLoading && (
				<div className={GRID_CLASS}>
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="flex flex-col gap-4 rounded-lg border px-4 py-3"
						>
							<div className="flex items-center gap-3">
								<Skeleton className="size-9 shrink-0 rounded-full" />
								<Skeleton className="h-4 flex-1" />
								<Skeleton className="h-5 w-14 rounded-full" />
							</div>
							<div className="flex flex-col gap-1.5">
								<Skeleton className="h-3 w-40" />
								<Skeleton className="h-2 w-full rounded-full" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
					))}
				</div>
			)}

			{!isLoading && activeGoals.length === 0 && (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PiggyBankIcon />
						</EmptyMedia>
						<EmptyTitle>{t("goals.noGoals")}</EmptyTitle>
						<EmptyDescription>{t("goals.noGoalsDescription")}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="outline" onClick={() => openModal("createGoal")}>
							<PlusIcon />
							{t("goals.addGoal")}
						</Button>
					</EmptyContent>
				</Empty>
			)}

			{activeGoals.length > 0 && (
				<div className={GRID_CLASS}>
					{activeGoals.map((item) => (
						<GoalCard key={item.goal.id} item={item} {...cardActions} />
					))}
				</div>
			)}

			{inactiveGoals.length > 0 && (
				<Collapsible className="flex flex-col gap-3">
					<CollapsibleTrigger
						render={
							<Button
								variant="ghost"
								className="group w-fit text-muted-foreground"
							/>
						}
					>
						<ChevronRightIcon className="transition-transform group-data-panel-open:rotate-90" />
						{t("goals.inactiveGoals", { count: inactiveGoals.length })}
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className={GRID_CLASS}>
							{inactiveGoals.map((item) => (
								<GoalCard key={item.goal.id} item={item} {...cardActions} />
							))}
						</div>
					</CollapsibleContent>
				</Collapsible>
			)}

			<CreateGoalDialog
				open={state.createGoal}
				setIsOpen={(open) =>
					open ? openModal("createGoal") : closeModal("createGoal")
				}
			/>

			<GoalDetailDialog
				open={state.goalDetail}
				setIsOpen={(open) =>
					open ? openModal("goalDetail") : closeModal("goalDetail")
				}
				item={current}
			/>

			<GoalContributionDialog
				open={state.contribution}
				setIsOpen={(open) =>
					open ? openModal("contribution") : closeModal("contribution")
				}
				mode={contributionMode}
				item={current}
			/>

			<PurchaseGoalDialog
				open={state.purchaseGoal}
				setIsOpen={(open) =>
					open ? openModal("purchaseGoal") : closeModal("purchaseGoal")
				}
				item={current}
			/>

			<EditGoalDialog
				open={state.editGoal}
				setIsOpen={(open) =>
					open ? openModal("editGoal") : closeModal("editGoal")
				}
				goal={selected?.goal ?? null}
			/>

			<ConfirmationDialog
				open={state.archiveGoal}
				onOpenChange={(open) =>
					open ? openModal("archiveGoal") : closeModal("archiveGoal")
				}
				title={t("goals.archive.title")}
				description={t("goals.archive.description", {
					name: selected?.goal.name,
				})}
				confirmText={t("goals.archive.confirm")}
				isLoading={archiveMutation.isPending}
				onConfirm={() => {
					if (selected) archiveMutation.mutate({ id: selected.goal.id });
				}}
			/>

			<ConfirmationDialog
				open={state.deleteGoal}
				onOpenChange={(open) =>
					open ? openModal("deleteGoal") : closeModal("deleteGoal")
				}
				title={t("goals.delete.title")}
				description={t("goals.delete.description", {
					name: selected?.goal.name,
				})}
				confirmText={t("goals.delete.confirm")}
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (selected) deleteMutation.mutate({ id: selected.goal.id });
				}}
			/>
		</div>
	);
}
