import type { AccountWithBalance } from "@finance-tracker/types";
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
import { pageHead } from "@/lib/page-head";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import CreateAccountDialog from "./-components/create-account-dialog";
import EditAccountDialog from "./-components/edit-account-dialog";

export const Route = createFileRoute("/accounts")({
	component: RouteComponent,
	head: () =>
		pageHead(
			"Accounts",
			"Manage your financial accounts to track income and expense sources.",
		),
});

function RouteComponent() {
	const { t } = useTranslation();
	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		delete: false,
	});

	const [selected, setSelected] = useState<AccountWithBalance | null>(null);

	const { data: accounts = [], isLoading } = useQuery(
		trpc.account.listWithBalance.queryOptions(),
	);

	const deleteMutation = useMutation(
		trpc.account.delete.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.account.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.account.listWithBalance.queryOptions(),
					),
				]);
				globalSuccessToast(t("accounts.toast.deleted"));
				closeModal("delete");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					t("accounts.toast.deleteFailed", { message: error.message }),
				);
			},
		}),
	);

	function handleEdit(account: AccountWithBalance) {
		setSelected(account);
		openModal("edit");
	}

	function handleDelete(account: AccountWithBalance) {
		setSelected(account);
		openModal("delete");
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">{t("accounts.title")}</h1>
					{isLoading ? (
						<Skeleton className="mt-1 h-4 w-24" />
					) : (
						<p className="text-muted-foreground text-sm">
							{t("accounts.accountCount", { count: accounts.length })}
						</p>
					)}
				</div>
				<Button onClick={() => openModal("create")}>
					{t("accounts.addAccount")}
				</Button>
			</div>

			<div className="flex flex-col gap-2">
				{accounts.map((account) => {
					const Icon = account.icon ? ICON_MAP[account.icon] : null;
					return (
						<div
							key={account.id}
							className="flex items-center gap-3 rounded-lg border px-4 py-3"
						>
							{Icon ? (
								<Icon
									className="size-4 shrink-0"
									style={{ color: account.color ?? "#94a3b8" }}
								/>
							) : (
								<div
									className="size-3 shrink-0 rounded-full"
									style={{ backgroundColor: account.color ?? "#94a3b8" }}
								/>
							)}
							<div className="flex flex-1 flex-col">
								<span className="font-medium text-sm">{account.name}</span>
								<span className="text-muted-foreground text-xs">
									{new Intl.NumberFormat("id-ID", {
										style: "currency",
										currency: account.currency,
										maximumFractionDigits: 0,
									}).format(account.balance)}
								</span>
							</div>
							<span className="text-muted-foreground text-xs capitalize">
								{account.type}
							</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleEdit(account)}
								>
									<PencilIcon className="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-destructive hover:text-destructive"
									onClick={() => handleDelete(account)}
								>
									<Trash2Icon className="size-3.5" />
								</Button>
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
				{accounts.length === 0 && !isLoading && (
					<p className="py-6 text-center text-muted-foreground text-sm">
						{t("accounts.noAccounts")}
					</p>
				)}
			</div>

			<CreateAccountDialog
				open={state.create}
				setIsOpen={(open) =>
					open ? openModal("create") : closeModal("create")
				}
			/>

			<EditAccountDialog
				open={state.edit}
				setIsOpen={(open) => (open ? openModal("edit") : closeModal("edit"))}
				account={selected}
			/>

			<ConfirmationDialog
				open={state.delete}
				onOpenChange={(open) =>
					open ? openModal("delete") : closeModal("delete")
				}
				title={t("accounts.delete.title")}
				description={t("accounts.delete.description", { name: selected?.name })}
				confirmText={t("accounts.delete.confirm")}
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (selected) deleteMutation.mutate({ id: selected.id });
				}}
			/>
		</div>
	);
}
