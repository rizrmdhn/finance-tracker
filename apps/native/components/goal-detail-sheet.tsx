import type { Account } from "@finance-tracker/types";
import {
	formatCurrency,
	type GoalContributionMode,
} from "@finance-tracker/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	ArchiveIcon,
	ArrowDownToLineIcon,
	ArrowUpFromLineIcon,
	ShoppingBagIcon,
	Trash2Icon,
} from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
	type GoalOverviewItem,
	useGoalErrorMessage,
	useGoalText,
} from "@/hooks/use-goal";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "./confirmation-dialog";
import GoalContributionDialog from "./form/goal-contribution-dialog";
import { ICON_MAP } from "./form/icon-picker";
import PurchaseGoalDialog from "./form/purchase-goal-dialog";
import { GoalEstimate, GoalHeader, GoalProgress } from "./goal-card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Icon } from "./ui/icon";
import { ModalSheet } from "./ui/modal-sheet";
import { Skeleton } from "./ui/skeleton";
import { Text } from "./ui/text";

/** Dialogs shown on top of the sheet portal into the sheet's own host. */
const SHEET_PORTAL_HOST = "modal-select";

interface GoalDetailSheetProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	item: GoalOverviewItem | null;
}

/**
 * A goal's progress, where its money comes from and its contribution history, with the actions
 * of an active goal. The contribution and purchase sheets are nested so they stack on top of it.
 */
export function GoalDetailSheet({
	open,
	setIsOpen,
	item,
}: GoalDetailSheetProps) {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();
	const { state, openModal, closeModal } = useModalState({
		contribution: false,
		purchase: false,
		archive: false,
	});
	const [mode, setMode] = useState<GoalContributionMode>("setAside");

	const archiveMutation = useMutation(
		trpc.goal.archive.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() });
				globalSuccessToast(t("goals.toast.archived"));
				closeModal("archive");
				setIsOpen(false);
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

	if (!item) return null;

	const { goal, progress } = item;
	const isActive = goal.status === "active";
	const canWithdraw = progress.contributions.some((c) => c.held > 0);

	function openContribution(next: GoalContributionMode) {
		setMode(next);
		openModal("contribution");
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("common.seeDetails")}
		>
			<GoalHeader item={item} />
			<GoalProgress item={item} />
			{!progress.isReached && <GoalEstimate item={item} />}

			{isActive && (
				<View className="flex flex-col gap-2">
					<View className="flex flex-row gap-2">
						<Button
							variant="outline"
							className="flex-1"
							disabled={!canWithdraw}
							onPress={() => openContribution("withdraw")}
						>
							<Icon as={ArrowUpFromLineIcon} className="size-4" />
							<Text>{t("goals.contribution.withdraw")}</Text>
						</Button>
						<Button
							className="flex-1"
							onPress={() => openContribution("setAside")}
						>
							<Icon
								as={ArrowDownToLineIcon}
								className="size-4 text-primary-foreground"
							/>
							<Text>{t("goals.contribution.setAside")}</Text>
						</Button>
					</View>
					<View className="flex flex-row gap-2">
						<Button
							variant={progress.isReached ? "default" : "outline"}
							className="flex-1"
							onPress={() => openModal("purchase")}
						>
							<Icon
								as={ShoppingBagIcon}
								className={cn(
									"size-4",
									progress.isReached && "text-primary-foreground",
								)}
							/>
							<Text>{t("goals.purchase.action")}</Text>
						</Button>
						<Button
							variant="outline"
							className="flex-1"
							onPress={() => openModal("archive")}
						>
							<Icon as={ArchiveIcon} className="size-4" />
							<Text>{t("goals.archive.action")}</Text>
						</Button>
					</View>
				</View>
			)}

			<GoalFunding item={item} />

			<GoalContributionList item={item} canDelete={isActive} />

			<GoalContributionDialog
				open={state.contribution}
				setIsOpen={(next) =>
					next ? openModal("contribution") : closeModal("contribution")
				}
				mode={mode}
				item={item}
			/>

			<PurchaseGoalDialog
				open={state.purchase}
				setIsOpen={(next) =>
					next ? openModal("purchase") : closeModal("purchase")
				}
				item={item}
			/>

			<ConfirmationDialog
				open={state.archive}
				onOpenChange={(next) =>
					next ? openModal("archive") : closeModal("archive")
				}
				title={t("goals.archive.title")}
				description={t("goals.archive.description", { name: goal.name })}
				confirmText={t("goals.archive.confirm")}
				isLoading={archiveMutation.isPending}
				onConfirm={() => archiveMutation.mutate({ id: goal.id })}
				portalHost={SHEET_PORTAL_HOST}
			/>
		</ModalSheet>
	);
}

function AccountLabel({ account }: { account?: Account }) {
	if (!account) return <Text className="text-sm">—</Text>;
	const AccountIcon = account.icon ? ICON_MAP[account.icon] : null;
	const color = account.color ?? "#94a3b8";

	return (
		<View className="flex min-w-0 flex-row items-center gap-2">
			{AccountIcon ? (
				<Icon as={AccountIcon} className="size-3.5 shrink-0" color={color} />
			) : (
				<View
					className="size-2.5 shrink-0 rounded-full"
					style={{ backgroundColor: color }}
				/>
			)}
			<Text className="shrink text-sm" numberOfLines={1}>
				{account.name}
			</Text>
		</View>
	);
}

/** Linked account balance + what's set aside per account, all in the goal's currency. */
function GoalFunding({ item }: { item: GoalOverviewItem }) {
	const { t } = useTranslation();
	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { goal, progress } = item;
	const format = (amount: number) => formatCurrency(amount, goal.currency);

	const linkedAccount = accounts.find((a) => a.id === goal.linkedAccountId);
	const rows = progress.contributions
		.filter((c) => c.held !== 0)
		.map((c) => ({
			...c,
			account: accounts.find((a) => a.id === c.accountId),
		}));

	return (
		<View className="flex flex-col gap-2">
			<Text className="font-medium text-sm">{t("goals.funding.title")}</Text>
			{!linkedAccount && rows.length === 0 ? (
				<Text className="text-muted-foreground text-xs">
					{t("goals.funding.empty")}
				</Text>
			) : (
				<View className="flex flex-col overflow-hidden rounded-lg border border-border">
					{linkedAccount && (
						<View className="flex flex-row items-center justify-between gap-3 border-border border-b px-3 py-2">
							<View className="min-w-0 flex-1 flex-col gap-0.5">
								<Text className="text-muted-foreground text-xs">
									{t("goals.funding.linkedAccount")}
								</Text>
								<AccountLabel account={linkedAccount} />
							</View>
							<Text className="font-medium text-xs">
								{format(progress.linkedBalance)}
							</Text>
						</View>
					)}
					{rows.map((row) => (
						<View
							key={row.accountId}
							className="flex flex-row items-center justify-between gap-3 border-border border-b px-3 py-2"
						>
							<View className="min-w-0 flex-1 flex-col gap-0.5">
								<Text className="text-muted-foreground text-xs">
									{t("goals.funding.setAside")}
								</Text>
								<AccountLabel account={row.account} />
							</View>
							<View className="flex flex-col items-end gap-0.5">
								<Text className="font-medium text-xs">{format(row.total)}</Text>
								{row.currency !== goal.currency && (
									<Text className="text-muted-foreground text-xs">
										{formatCurrency(row.held, row.currency)}
									</Text>
								)}
							</View>
						</View>
					))}
					<View className="flex flex-row items-center justify-between gap-3 bg-muted/50 px-3 py-2">
						<Text className="font-medium text-xs">
							{t("goals.funding.total")}
						</Text>
						<Text className="font-medium text-xs">
							{format(progress.total)}
						</Text>
					</View>
				</View>
			)}
		</View>
	);
}

/** Newest first; amounts in the source account's currency. */
function GoalContributionList({
	item,
	canDelete,
}: {
	item: GoalOverviewItem;
	canDelete: boolean;
}) {
	const { t } = useTranslation();
	const { formatDate } = useGoalText();
	const goalErrorMessage = useGoalErrorMessage();
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const { data: contributions = [], isLoading } = useQuery(
		trpc.goal.getContributions.queryOptions({ goalId: item.goal.id }),
	);

	const deleteMutation = useMutation(
		trpc.goal.deleteContribution.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() });
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
		<View className="flex flex-col gap-2">
			<Text className="font-medium text-sm">
				{t("goals.contributions.title")}
			</Text>
			{isLoading ? (
				<View className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</View>
			) : contributions.length === 0 ? (
				<Text className="text-muted-foreground text-xs">
					{t("goals.contributions.empty")}
				</Text>
			) : (
				<View className="flex flex-col overflow-hidden rounded-lg border border-border">
					{contributions.map((contribution) => {
						const isWithdrawal = contribution.amount < 0;
						return (
							<View
								key={contribution.id}
								className="flex flex-row items-center gap-3 border-border border-b px-3 py-2"
							>
								<View className="min-w-0 flex-1 flex-col gap-0.5">
									<View className="flex min-w-0 flex-row items-center gap-2">
										<View className="min-w-0 shrink">
											<AccountLabel
												account={contribution.account ?? undefined}
											/>
										</View>
										<Badge variant={isWithdrawal ? "outline" : "secondary"}>
											<Text>
												{t(
													isWithdrawal
														? "goals.contributions.withdrawn"
														: "goals.contributions.setAside",
												)}
											</Text>
										</Badge>
									</View>
									<Text
										className="text-muted-foreground text-xs"
										numberOfLines={1}
									>
										{formatDate(contribution.date)}
										{contribution.note && ` · ${contribution.note}`}
									</Text>
								</View>
								<Text
									className={cn(
										"font-medium text-xs",
										isWithdrawal
											? "text-muted-foreground"
											: "text-emerald-600 dark:text-emerald-400",
									)}
								>
									{isWithdrawal ? "−" : "+"}
									{formatCurrency(
										Math.abs(contribution.amount),
										contribution.account?.currency ?? item.goal.currency,
									)}
								</Text>
								{canDelete && (
									<Button
										variant="ghost"
										size="sm"
										accessibilityLabel={t("common.delete")}
										onPress={() => setDeletingId(contribution.id)}
									>
										<Icon
											as={Trash2Icon}
											className="size-3.5 text-destructive"
										/>
									</Button>
								)}
							</View>
						);
					})}
				</View>
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
				portalHost={SHEET_PORTAL_HOST}
			/>
		</View>
	);
}
