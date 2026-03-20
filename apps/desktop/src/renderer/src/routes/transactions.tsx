import { paginatedTransactionsSchema } from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { useMemo } from "react";
import getTransactionsColumns from "@/components/columns/transaction-columns";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTableRouter } from "@/hooks/use-data-table-router";
import useModalState from "@/hooks/use-modal-state";
import { pageHead } from "@/lib/page-head";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/transactions")({
	validateSearch: paginatedTransactionsSchema,
	component: TransactionsComponent,
	head: () =>
		pageHead(
			"Transaksi",
			"Kelola semua transaksi keuangan Anda di sini. Tambah, edit, atau hapus transaksi sesuai kebutuhan untuk menjaga catatan keuangan Anda tetap akurat dan terorganisir.",
		),
});

function TransactionsComponent() {
	const params = Route.useSearch();
	const navigate = Route.useNavigate();

	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		delete: false,
	});

	const {
		data: transactions,
		isLoading,
		error,
	} = useQuery({
		...trpc.transaction.paginated.queryOptions(params),
		placeholderData: keepPreviousData,
	});

	const columns = useMemo(
		() =>
			getTransactionsColumns({
				currentPage: params.page,
				perPage: params.limit,
			}),
		[params.page, params.limit],
	);

	const { table } = useDataTableRouter({
		data: transactions?.data ?? [],
		columns,
		pageCount: transactions?.pageCount ?? 0,
		search: params,
		navigate: ({ search: updater }) => {
			navigate({ search: updater });
		},
		initialState: {
			sorting: [{ id: "createdAt", desc: false }],
		},
		getRowId: (row) => row.id,
	});

	function _handleEdit(_tx: Transaction) {
		openModal("edit");
	}

	return (
		<div className="flex flex-col p-4">
			<div className="mb-4 flex items-center justify-between gap-4">
				<Button onClick={() => openModal("create")}>
					<PlusCircle className="size-4" />
					Tambah Transaksi
				</Button>
			</div>
			<DataTable
				table={table}
				isLoading={isLoading}
				error={error}
				emptyMessage="Tidak ada transaksi yang ditemukan"
				emptyDescription="Coba sesuaikan filter atau kata kunci pencarian Anda."
			>
				<DataTableToolbar table={table}>
					<DataTableFilterMenu table={table} />
					<DataTableSortList table={table} />
				</DataTableToolbar>
			</DataTable>
		</div>
	);
}
