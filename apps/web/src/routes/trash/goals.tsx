import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@finance-tracker/ui/components/alert-dialog";
import { Button } from "@finance-tracker/ui/components/button";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ICON_MAP } from "@/components/icon-picker";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { formatAmount, useGoalErrorMessage } from "../-components/goal-utils";

export const Route = createFileRoute("/trash/goals")({
	component: TrashGoalsComponent,
});

function TrashGoalsComponent() {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();

	const { data: goals = [], isLoading } = useQuery(
		trpc.goal.listDeleted.queryOptions(),
	);

	// Restoring brings a goal back to the goals page, so refresh every goal query
	const invalidateGoals = () =>
		queryClient.invalidateQueries({ queryKey: trpc.goal.pathKey() });

	const restoreMutation = useMutation(
		trpc.goal.restore.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(
					t("trash.toast.restored", { name: t("trash.goals") }),
				);
			},
			onError: (err) =>
				globalErrorToast(
					goalErrorMessage(err, (message) =>
						t("trash.toast.restoreFailed", {
							name: t("trash.goals"),
							message,
						}),
					),
				),
		}),
	);

	const permanentDeleteMutation = useMutation(
		trpc.goal.permanentDelete.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", { name: t("trash.goals") }),
				);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.goals"),
						message: err.message,
					}),
				),
		}),
	);

	const emptyTrashMutation = useMutation(
		trpc.goal.emptyTrash.mutationOptions({
			onSuccess: async () => {
				await invalidateGoals();
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", { name: t("trash.goals") }),
				);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.goals"),
						message: err.message,
					}),
				),
		}),
	);

	const isPending =
		restoreMutation.isPending || permanentDeleteMutation.isPending;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								variant="destructive"
								disabled={emptyTrashMutation.isPending || goals.length === 0}
							>
								<Trash2 className="size-4" />
								{t("trash.emptyTrash")}
							</Button>
						}
					/>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t("trash.emptyTrash")}</AlertDialogTitle>
							<AlertDialogDescription>
								{t("trash.toast.confirmEmptyTrash")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 text-white hover:bg-red-500"
								onClick={() => emptyTrashMutation.mutate()}
							>
								{t("trash.emptyTrash")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			<div className="flex flex-col gap-2">
				{goals.map((goal) => {
					const Icon = ICON_MAP[goal.icon];
					return (
						<div
							key={goal.id}
							className="flex items-center gap-3 rounded-lg border px-4 py-3"
						>
							{Icon ? (
								<Icon
									className="size-4 shrink-0"
									style={{ color: goal.color }}
								/>
							) : (
								<div
									className="size-3 shrink-0 rounded-full"
									style={{ backgroundColor: goal.color }}
								/>
							)}
							<div className="flex flex-1 flex-col">
								<span className="font-medium text-sm">{goal.name}</span>
								<span className="text-muted-foreground text-xs">
									{formatAmount(goal.targetAmount, goal.currency)}
								</span>
							</div>
							<span className="text-muted-foreground text-xs">
								{t(`goals.status.${goal.status}`)}
							</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={isPending}
									onClick={() => restoreMutation.mutate({ id: goal.id })}
								>
									<RotateCcw className="size-3.5" />
								</Button>
								<AlertDialog>
									<AlertDialogTrigger
										render={
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive hover:text-destructive"
												disabled={isPending}
											>
												<Trash2 className="size-3.5" />
											</Button>
										}
									/>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												{t("trash.permanentDelete")}
											</AlertDialogTitle>
											<AlertDialogDescription>
												{t("trash.toast.confirmPermanentDelete", {
													name: goal.name,
												})}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>
												{t("common.cancel")}
											</AlertDialogCancel>
											<AlertDialogAction
												className="bg-red-600 text-white hover:bg-red-500"
												onClick={() =>
													permanentDeleteMutation.mutate({ id: goal.id })
												}
											>
												{t("trash.permanentDelete")}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</div>
					);
				})}

				{isLoading &&
					[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="flex h-15.5 items-center gap-3 rounded-lg border px-4 py-3"
						>
							<Skeleton className="size-4 shrink-0 rounded-full" />
							<div className="flex flex-1 flex-col gap-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-3 w-10" />
							<div className="flex items-center gap-1">
								<Skeleton className="size-7" />
								<Skeleton className="size-7" />
							</div>
						</div>
					))}

				{goals.length === 0 && !isLoading && (
					<p className="py-8 text-center text-muted-foreground text-sm">
						{t("trash.noItems")}
					</p>
				)}
			</div>
		</div>
	);
}
