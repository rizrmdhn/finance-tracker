import type { AccountWithBalance } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
			"Akun",
			"Kelola akun keuangan Anda untuk melacak sumber pendapatan dan pengeluaran dengan lebih baik. Tambah, edit, atau hapus akun sesuai kebutuhan untuk menjaga catatan keuangan Anda tetap akurat dan terorganisir.",
		),
});

function RouteComponent() {
	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		delete: false,
	});

	const [selected, setSelected] = useState<AccountWithBalance | null>(null);

	const { data: accounts = [] } = useQuery(
		trpc.account.listWithBalance.queryOptions(),
	);

	const deleteMutation = useMutation(
		trpc.account.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.account.listWithBalance.queryOptions(),
				);
				globalSuccessToast("Account deleted");
				closeModal("delete");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(`Failed to delete account: ${error.message}`);
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
					<h1 className="font-semibold text-xl">Akun</h1>
					<p className="text-muted-foreground text-sm">
						{accounts.length} akun
					</p>
				</div>
				<Button onClick={() => openModal("create")}>Tambah Akun</Button>
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
				{accounts.length === 0 && (
					<p className="py-6 text-center text-muted-foreground text-sm">
						Belum ada akun
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
				title="Delete Account"
				description={`Are you sure you want to delete "${selected?.name}"? This cannot be undone.`}
				confirmText="Delete"
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (selected) deleteMutation.mutate({ id: selected.id });
				}}
			/>
		</div>
	);
}
