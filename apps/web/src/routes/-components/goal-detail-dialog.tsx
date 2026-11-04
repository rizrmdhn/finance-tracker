import { Badge } from "@finance-tracker/ui/components/badge";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@finance-tracker/ui/components/dialog";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { cn } from "@finance-tracker/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	ArrowDownToLineIcon,
	ArrowUpFromLineIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ICON_MAP } from "@/components/icon-picker";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import {
	GoalEstimate,
	GoalProductLink,
	GoalProgress,
	GoalStatusBadge,
} from "./goal-card";
import GoalContributionDialog, {
	type GoalContributionMode,
} from "./goal-contribution-dialog";
import { AccountOption } from "./goal-form-fields";
import {
	formatAmount,
	type GoalOverviewItem,
	useGoalErrorMessage,
	useGoalText,
} from "./goal-utils";

interface GoalDetailDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	item: GoalOverviewItem | null;
}

/**
 * A goal's progress, where its money comes from and its contribution history. The
 * contribution and delete dialogs are nested here so they stack on top of it.
 */
export default function GoalDetailDialog({
	open,
	setIsOpen,
	item,
}: GoalDetailDialogProps) {
	const { t } = useTranslation();
	const { state, openModal, closeModal } = useModalState({
		contribution: false,
	});
	const [mode, setMode] = useState<GoalContributionMode>("setAside");

	if (!item) return null;

	const { goal, progress } = item;
	const Icon = ICON_MAP[goal.icon];
	const isActive = goal.status === "active";
	const canWithdraw = progress.contributions.some((c) => c.held > 0);

	function openContribution(next: GoalContributionMode) {
		setMode(next);
		openModal("contribution");
	}

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<div className="flex items-center gap-3 pr-8">
						<div
							className="flex size-9 shrink-0 items-center justify-center rounded-full"
							style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
						>
							{Icon && <Icon className="size-4" />}
						</div>
						<div className="flex min-w-0 flex-1 flex-col">
							<DialogTitle className="truncate">{goal.name}</DialogTitle>
							{goal.productUrl && <GoalProductLink url={goal.productUrl} />}
						</div>
						<GoalStatusBadge item={item} />
					</div>
				</DialogHeader>

				<GoalProgress item={item} />
				{!progress.isReached && <GoalEstimate item={item} />}

				<GoalFunding item={item} />

				<GoalContributionList item={item} canDelete={isActive} open={open} />

				{isActive && (
					<DialogFooter>
						<Button
							variant="outline"
							disabled={!canWithdraw}
							onClick={() => openContribution("withdraw")}
						>
							<ArrowUpFromLineIcon />
							{t("goals.contribution.withdraw")}
						</Button>
						<Button onClick={() => openContribution("setAside")}>
							<ArrowDownToLineIcon />
							{t("goals.contribution.setAside")}
						</Button>
					</DialogFooter>
				)}

				<GoalContributionDialog
					open={state.contribution}
					setIsOpen={(next) =>
						next ? openModal("contribution") : closeModal("contribution")
					}
					mode={mode}
					item={item}
				/>
			</DialogContent>
		</Dialog>
	);
}

/** Linked account balance + what's set aside per account, all in the goal's currency. */
function GoalFunding({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { goal, progress } = item;
	const format = (amount: number) => formatAmount(amount, goal.currency);

	const linkedAccount = accounts.find((a) => a.id === goal.linkedAccountId);
	const rows = progress.contributions
		.filter((c) => c.held !== 0)
		.map((c) => ({
			...c,
			account: accounts.find((a) => a.id === c.accountId),
		}));

	return (
		<section className="flex flex-col gap-2">
			<h3 className="font-medium text-sm">{t("goals.funding.title")}</h3>
			{!linkedAccount && rows.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					{t("goals.funding.empty")}
				</p>
			) : (
				<div className="flex flex-col divide-y rounded-lg border text-xs">
					{linkedAccount && (
						<div className="flex items-center justify-between gap-3 px-3 py-2">
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-muted-foreground">
									{t("goals.funding.linkedAccount")}
								</span>
								<AccountOption account={linkedAccount} />
							</div>
							<span className="shrink-0 font-medium tabular-nums">
								{format(progress.linkedBalance)}
							</span>
						</div>
					)}
					{rows.map((row) => (
						<div
							key={row.accountId}
							className="flex items-center justify-between gap-3 px-3 py-2"
						>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-muted-foreground">
									{t("goals.funding.setAside")}
								</span>
								{row.account ? (
									<AccountOption account={row.account} />
								) : (
									<span>—</span>
								)}
							</div>
							<div className="flex shrink-0 flex-col items-end gap-0.5 tabular-nums">
								<span className="font-medium">{format(row.total)}</span>
								{row.currency !== goal.currency && (
									<span className="text-muted-foreground">
										{formatAmount(row.held, row.currency)}
									</span>
								)}
							</div>
						</div>
					))}
					<div className="flex items-center justify-between gap-3 bg-muted/50 px-3 py-2 font-medium">
						<span>{t("goals.funding.total")}</span>
						<span className="tabular-nums">{format(progress.total)}</span>
					</div>
				</div>
			)}
		</section>
	);
}

interface GoalContributionListProps {
	item: GoalOverviewItem;
	canDelete: boolean;
	open: boolean;
}

/** Newest first; amounts in the source account's currency. */
function GoalContributionList({
	item,
	canDelete,
	open,
}: GoalContributionListProps) {
	const { t } = useTranslation();
	const { formatDate } = useGoalText();
	const goalErrorMessage = useGoalErrorMessage();
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const { data: contributions = [], isLoading } = useQuery(
		trpc.goal.getContributions.queryOptions(
			{ goalId: item.goal.id },
			{ enabled: open },
		),
	);

	const deleteMutation = useMutation(
		trpc.goal.deleteContribution.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.goal.pathKey(),
				});
				globalSuccessToast(t("goals.toast.contributionDeleted"));
				setDeletingId(null);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.contributionDeleteFailed", { message }),
					),
				);
			},
		}),
	);

	return (
		<section className="flex flex-col gap-2">
			<h3 className="font-medium text-sm">{t("goals.contributions.title")}</h3>
			{isLoading ? (
				<div className="flex flex-col gap-2">
					{[...Array(2)].map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			) : contributions.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					{t("goals.contributions.empty")}
				</p>
			) : (
				<div className="flex flex-col divide-y rounded-lg border text-xs">
					{contributions.map((contribution) => {
						const isWithdrawal = contribution.amount < 0;
						return (
							<div
								key={contribution.id}
								className="flex items-center gap-3 px-3 py-2"
							>
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									<div className="flex min-w-0 items-center gap-2">
										{contribution.account ? (
											<AccountOption account={contribution.account} />
										) : (
											<span>—</span>
										)}
										<Badge variant={isWithdrawal ? "outline" : "secondary"}>
											{t(
												isWithdrawal
													? "goals.contributions.withdrawn"
													: "goals.contributions.setAside",
											)}
										</Badge>
									</div>
									<span className="truncate text-muted-foreground">
										{formatDate(contribution.date)}
										{contribution.note && ` · ${contribution.note}`}
									</span>
								</div>
								<span
									className={cn(
										"shrink-0 font-medium tabular-nums",
										isWithdrawal
											? "text-muted-foreground"
											: "text-emerald-600 dark:text-emerald-400",
									)}
								>
									{isWithdrawal ? "−" : "+"}
									{formatAmount(
										Math.abs(contribution.amount),
										contribution.account?.currency ?? item.goal.currency,
									)}
								</span>
								{canDelete && (
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive hover:text-destructive"
										aria-label={t("common.delete")}
										onClick={() => setDeletingId(contribution.id)}
									>
										<Trash2Icon className="size-3.5" />
									</Button>
								)}
							</div>
						);
					})}
				</div>
			)}

			<ConfirmationDialog
				open={deletingId !== null}
				onOpenChange={(next) => {
					if (!next) setDeletingId(null);
				}}
				title={t("goals.contributions.delete.title")}
				description={t("goals.contributions.delete.description")}
				confirmText={t("goals.contributions.delete.confirm")}
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (deletingId) deleteMutation.mutate({ id: deletingId });
				}}
			/>
		</section>
	);
}
