import { paginatedTransactionsSchema } from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@finance-tracker/ui/components/dropdown-menu";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Download, PlusCircle, Upload } from "lucide-react";
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
import {
	globalErrorToast,
	globalInfoToast,
	globalSuccessToast,
} from "@/lib/toast";
import { serializeToCSV, serializeToJSON } from "@/lib/transaction-io";
import { trpc, trpcClient } from "@/lib/trpc";
import CreateTransactionDialog from "./-components/create-transaction-dialog";
import EditTransactionDialog from "./-components/edit-transaction-dialog";
import ImportTransactionsDialog from "./-components/import-transactions-dialog";

export const Route = createFileRoute("/transactions")({
	validateSearch: paginatedTransactionsSchema,
	component: TransactionsComponent,
	head: () =>
		pageHead("Transactions", "Manage all your financial transactions here."),
});

function TransactionsComponent() {
	const { t } = useTranslation();
	const params = Route.useSearch();
	const navigate = Route.useNavigate();

	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		import: false,
	});

	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	const [importFileData, setImportFileData] = useState<{
		content: string;
		filename: string;
	} | null>(null);

	const {
		data: transactions,
		isLoading,
		error,
	} = useQuery({
		...trpc.transaction.paginated.queryOptions(params),
		placeholderData: keepPreviousData,
	});

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const accountsMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a.name])),
		[accounts],
	);
	const accountCurrencyMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a.currency])),
		[accounts],
	);
	const categoriesMap = useMemo(
		() => new Map(categories.map((c) => [c.id, c.name])),
		[categories],
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
				accountCurrencyMap,
			}),
		[params.page, params.limit, handleEdit, accountsMap, accountCurrencyMap],
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

	async function handleExport(exportFormat: "csv" | "json") {
		try {
			const { page: _p, limit: _l, ...exportParams } = params;
			const data = await trpcClient.transaction.exportData.query(exportParams);

			if (!data.length) {
				globalInfoToast("No transactions to export with the current filters.");
				return;
			}

			const content =
				exportFormat === "csv"
					? serializeToCSV(data, categoriesMap, accountsMap)
					: serializeToJSON(data);

			const dateStr = format(new Date(), "yyyy-MM-dd");
			const defaultName = `transactions-${dateStr}.${exportFormat}`;

			const result = await window.electronDataManager.exportFile({
				content,
				format: exportFormat,
				defaultName,
			});

			if (result.cancelled) return;

			if (result.success) {
				globalSuccessToast(
					`${data.length} transaction${data.length !== 1 ? "s" : ""} exported successfully.`,
				);
			} else {
				globalErrorToast(`Export failed: ${result.error}`);
			}
		} catch (err) {
			globalErrorToast(`Export failed: ${(err as Error).message}`);
		}
	}

	async function handleImport() {
		const result = await window.electronDataManager.importFile();
		if (result.cancelled) return;
		if (!result.success || !result.content || !result.filename) {
			if (result.error) globalErrorToast(`Import failed: ${result.error}`);
			return;
		}
		setImportFileData({ content: result.content, filename: result.filename });
		openModal("import");
	}

	return (
		<div className="flex flex-col">
			<div className="mb-4 flex items-center justify-end gap-2">
				<Button variant="outline" onClick={handleImport}>
					<Upload className="size-4" />
					Import
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button variant="outline">
								<Download className="size-4" />
								Export
							</Button>
						}
					/>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => handleExport("csv")}>
							Export as CSV
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleExport("json")}>
							Export as JSON
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
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
			{importFileData && (
				<ImportTransactionsDialog
					open={state.import}
					onOpenChange={(open) =>
						open ? openModal("import") : closeModal("import")
					}
					fileContent={importFileData.content}
					filename={importFileData.filename}
				/>
			)}
		</div>
	);
}
