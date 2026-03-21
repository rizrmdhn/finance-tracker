import { paginatedTransactionsSchema } from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import getTransactionsColumns from "@/components/columns/transaction-columns";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTableRouter } from "@/hooks/use-data-table-router";
import useModalState from "@/hooks/use-modal-state";
import { pageHead } from "@/lib/page-head";
import { trpc } from "@/lib/trpc";
import CreateTransactionDialog from "./-components/create-transaction-dialog";
import EditTransactionDialog from "./-components/edit-transaction-dialog";

export const Route = createFileRoute("/transactions")({
	validateSearch: paginatedTransactionsSchema,
	component: TransactionsComponent,
	head: () =>
		pageHead(
			"Transactions",
			"Manage all your financial transactions here.",
		),
});

function TransactionsComponent() {
	const { t } = useTranslation();
	const params = Route.useSearch();
	const navigate = Route.useNavigate();

	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
	});

	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	const {
		data: transactions,
		isLoading,
		error,
	} = useQuery({
		...trpc.transaction.paginated.queryOptions(params),
		placeholderData: keepPreviousData,
	});

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());

	const accountsMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a.name])),
		[accounts],
	);

	const handleEdit = useCallback(
		(tx: Transaction) => {
			setSelectedTransaction(tx);
			openModal("edit");
		},
		[openModal],
	);

	const columns = useMemo(
		() =>
			getTransactionsColumns({
				currentPage: params.page,
				perPage: params.limit,
				onEdit: handleEdit,
				accountsMap,
			}),
		[params.page, params.limit, handleEdit, accountsMap],
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

	return (
		<div className="flex flex-col">
			<div className="mb-4 flex items-center justify-end gap-4">
				<Button onClick={() => openModal("create")}>
					<PlusCircle className="size-4" />
					{t("transactions.addTransaction")}
				</Button>
			</div>
			<DataTable
				table={table}
				isLoading={isLoading}
				error={error}
				emptyMessage={t("transactions.noTransactions")}
				emptyDescription={t("transactions.noTransactionsDescription")}
			>
				<DataTableToolbar table={table}>
					<DataTableFilterMenu table={table} />
					<DataTableSortList table={table} />
				</DataTableToolbar>
			</DataTable>
			<CreateTransactionDialog
				open={state.create}
				setIsOpen={(open) =>
					open ? openModal("create") : closeModal("create")
				}
			/>
			<EditTransactionDialog
				open={state.edit}
				setIsOpen={(open) => (open ? openModal("edit") : closeModal("edit"))}
				transaction={selectedTransaction}
			/>
		</div>
	);
}
