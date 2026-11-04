import type { Transaction } from "@finance-tracker/types";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import DataTableActionCell from "@/components/data-table-action-cell";
import {
	createActionColumn,
	createDateColumn,
	createNumberColumn,
	createPriceColumn,
	createTagsColumn,
	createTextColumn,
} from "@/lib/column-helpers";
import { useOptimisticMutation } from "@/lib/optimistic-update";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Route } from "@/routes/trash/transactions";

interface TrashTransactionColumnsProps {
	currentPage: number;
	perPage: number;
	accountsMap: Map<string, string>;
}

function TrashTransactionActionCell({ row }: { row: Row<Transaction> }) {
	const { t } = useTranslation();
	const params = Route.useSearch();
	const queryOptions = trpc.transaction.paginated.queryOptions({
		...params,
		showDeleted: true,
	});

	const restoreMut = useOptimisticMutation(
		trpc.transaction.restore.mutationOptions(),
		{
			queryOptions,
			operation: { type: "delete", getId: (input) => input.id },
			onSuccess: () => {
				globalSuccessToast(
					t("trash.toast.restored", { name: t("trash.transactions") }),
				);
			},
			onError: (err) => {
				globalErrorToast(
					t("trash.toast.restoreFailed", {
						name: t("trash.transactions"),
						message: err.message,
					}),
				);
			},
		},
	);

	const permanentDeleteMut = useOptimisticMutation(
		trpc.transaction.permanentDelete.mutationOptions(),
		{
			queryOptions,
			operation: { type: "delete", getId: (input) => input.id },
			onSuccess: () => {
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", {
						name: t("trash.transactions"),
					}),
				);
			},
			onError: (err) => {
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.transactions"),
						message: err.message,
					}),
				);
			},
		},
	);

	return (
		<DataTableActionCell
			icon={<Trash2 className="mr-4 size-4" />}
			isLoading={permanentDeleteMut.isPending || restoreMut.isPending}
			triggerText={t("trash.permanentDelete")}
			dialogTitle={t("trash.permanentDelete")}
			dialogDescription={t("trash.toast.confirmPermanentDelete", {
				name: row.original.note ?? t("trash.transactions"),
			})}
			btnClassName="bg-red-600 text-white hover:bg-red-500"
			showEdit={false}
			customActions={[
				{
					icon: <RotateCcw className="mr-4 size-4" />,
					text: t("trash.restore"),
					action: () => restoreMut.mutate({ id: row.original.id }),
				},
			]}
			onConfirm={() => permanentDeleteMut.mutate({ id: row.original.id })}
		/>
	);
}

export default function getTrashTransactionColumns({
	currentPage,
	perPage,
	accountsMap,
}: TrashTransactionColumnsProps): ColumnDef<Transaction>[] {
	const accountColumn: ColumnDef<Transaction> = {
		id: "accountId",
		accessorKey: "accountId",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Akun" label="Akun" />
		),
		cell: ({ row }) => (
			<div className="w-32 truncate">
				{accountsMap.get(row.getValue("accountId")) ?? "-"}
			</div>
		),
		meta: { label: "Akun" },
	};

	return [
		createNumberColumn<Transaction>(currentPage, perPage),
		createPriceColumn<Transaction>("amount", "Jumlah", { width: "w-32" }),
		accountColumn,
		createTextColumn<Transaction>("note", "Catatan", { width: "w-24" }),
		createTagsColumn<Transaction>("tags", "Tag"),
		createDateColumn<Transaction>("deletedAt", "Dihapus", { nullable: true }),
		createActionColumn<Transaction>(({ row }) => (
			<TrashTransactionActionCell row={row} />
		)),
	];
}
