import { Button } from "@finance-tracker/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@finance-tracker/ui/components/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ICON_MAP } from "@/components/icon-picker";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import CreateTransactionDialog from "./-components/create-transaction-dialog";
import EditTransactionDialog from "./-components/edit-transaction-dialog";
import { formatCurrency, formatDate } from "./-components/utils";

export const Route = createFileRoute("/transactions")({
	component: TransactionsComponent,
});

type Transaction = {
	id: string;
	amount: number;
	note: string | null;
	categoryId: string | null;
	tags: string | null;
	date: number;
};

type SortDir = "asc" | "desc";

const typeAmountClass: Record<string, string> = {
	income: "text-green-600",
	expense: "text-red-500",
	savings: "text-violet-500",
	transfer: "text-muted-foreground",
};

const typePrefix: Record<string, string> = {
	income: "+",
	expense: "−",
	savings: "−",
	transfer: "",
};

function TransactionsComponent() {
	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		delete: false,
	});

	const [selected, setSelected] = useState<Transaction | null>(null);
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	const { data: transactions = [] } = useQuery(
		trpc.transaction.list.queryOptions(),
	);
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const categoryMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c])),
		[categories],
	);

	const sorted = useMemo(
		() =>
			[...transactions].sort((a, b) =>
				sortDir === "desc" ? b.date - a.date : a.date - b.date,
			),
		[transactions, sortDir],
	);

	const deleteMutation = useMutation(
		trpc.transaction.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.transaction.list.queryOptions(),
				);
				globalSuccessToast("Transaction deleted");
				closeModal("delete");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(`Failed to delete: ${error.message}`);
			},
		}),
	);

	function handleEdit(tx: Transaction) {
		setSelected(tx);
		openModal("edit");
	}

	function handleDelete(tx: Transaction) {
		setSelected(tx);
		openModal("delete");
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">Transaksi</h1>
					<p className="text-muted-foreground text-sm">
						{transactions.length} transaksi
					</p>
				</div>
				<Button onClick={() => openModal("create")}>
					<PlusIcon className="size-4" />
					Tambah Transaksi
				</Button>
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								<Button
									variant="ghost"
									size="sm"
									className="-ml-3 gap-1 font-medium"
									onClick={() =>
										setSortDir((d) => (d === "desc" ? "asc" : "desc"))
									}
								>
									Tanggal
									<ArrowUpDown className="size-3.5" />
								</Button>
							</TableHead>
							<TableHead>Kategori</TableHead>
							<TableHead>Catatan</TableHead>
							<TableHead>Tags</TableHead>
							<TableHead className="text-right">Jumlah</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{sorted.map((tx) => {
							const category = categoryMap.get(tx.categoryId ?? "");
							const Icon = category?.icon ? ICON_MAP[category.icon] : null;
							const tags: string[] = tx.tags ? JSON.parse(tx.tags) : [];
							const amountClass =
								typeAmountClass[category?.type ?? ""] ?? "text-muted-foreground";
							const prefix = typePrefix[category?.type ?? ""] ?? "";

							return (
								<TableRow key={tx.id}>
									<TableCell className="text-muted-foreground">
										{formatDate(tx.date)}
									</TableCell>
									<TableCell>
										{category ? (
											<div className="flex items-center gap-2">
												{Icon ? (
													<Icon
														className="size-3.5 shrink-0"
														style={{ color: category.color ?? "#94a3b8" }}
													/>
												) : (
													<span
														className="size-2.5 shrink-0 rounded-full"
														style={{
															backgroundColor: category.color ?? "#94a3b8",
														}}
													/>
												)}
												<span>{category.name}</span>
											</div>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell className="max-w-48 truncate text-muted-foreground">
										{tx.note ?? "—"}
									</TableCell>
									<TableCell>
										{tags.length > 0 ? (
											<div className="flex flex-wrap gap-1">
												{tags.map((tag) => (
													<span
														key={tag}
														className="rounded-full bg-muted px-2 py-0.5 text-xs"
													>
														{tag}
													</span>
												))}
											</div>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell
										className={`text-right font-medium tabular-nums ${amountClass}`}
									>
										{prefix}
										{formatCurrency(tx.amount)}
									</TableCell>
									<TableCell>
										<div className="flex items-center justify-end gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => handleEdit(tx)}
											>
												<PencilIcon className="size-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive hover:text-destructive"
												onClick={() => handleDelete(tx)}
											>
												<Trash2Icon className="size-3.5" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
						{sorted.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={6}
									className="py-8 text-center text-muted-foreground"
								>
									Belum ada transaksi
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<CreateTransactionDialog
				open={state.create}
				setIsOpen={(open) => (open ? openModal("create") : closeModal("create"))}
			/>

			<EditTransactionDialog
				open={state.edit}
				setIsOpen={(open) => (open ? openModal("edit") : closeModal("edit"))}
				transaction={selected}
			/>

			<ConfirmationDialog
				open={state.delete}
				onOpenChange={(open) =>
					open ? openModal("delete") : closeModal("delete")
				}
				title="Hapus Transaksi"
				description="Yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan."
				confirmText="Hapus"
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (selected) deleteMutation.mutate({ id: selected.id });
				}}
			/>
		</div>
	);
}
