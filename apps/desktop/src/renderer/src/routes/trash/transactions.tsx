import { paginatedTransactionsSchema } from "@finance-tracker/schema";
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
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import getTrashTransactionColumns from "@/components/columns/trash-transaction-columns";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTableRouter } from "@/hooks/use-data-table-router";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

const trashTransactionsSchema = paginatedTransactionsSchema.omit({
	showDeleted: true,
});

export const Route = createFileRoute("/trash/transactions")({
	validateSearch: trashTransactionsSchema,
	component: TrashTransactionsComponent,
});

function TrashTransactionsComponent() {
	const { t } = useTranslation();
	const params = Route.useSearch();
	const navigate = Route.useNavigate();

	const {
		data: transactions,
		isLoading,
		error,
	} = useQuery({
		...trpc.transaction.paginated.queryOptions({
			...params,
			showDeleted: true,
		}),
		placeholderData: keepPreviousData,
	});

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());

	const accountsMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a.name])),
		[accounts],
	);

	const columns = useMemo(
		() =>
			getTrashTransactionColumns({
				currentPage: params.page,
				perPage: params.limit,
				accountsMap,
			}),
		[params.page, params.limit, accountsMap],
	);

	const { table } = useDataTableRouter({
		data: transactions?.data ?? [],
		columns,
		pageCount: transactions?.pageCount ?? 0,
		search: params,
		navigate: ({ search: updater }) => navigate({ search: updater }),
		getRowId: (row) => row.id,
	});

	const emptyTrashMut = useMutation(
		trpc.transaction.emptyTrash.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.transaction.paginated.queryOptions({
						...params,
						showDeleted: true,
					}),
				);
				globalSuccessToast(
					t("trash.toast.permanentlyDeleted", {
						name: t("trash.transactions"),
					}),
				);
			},
			onError: (err) =>
				globalErrorToast(
					t("trash.toast.permanentDeleteFailed", {
						name: t("trash.transactions"),
						message: err.message,
					}),
				),
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								variant="destructive"
								disabled={
									emptyTrashMut.isPending ||
									(transactions?.data.length ?? 0) === 0
								}
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
								onClick={() => emptyTrashMut.mutate()}
							>
								{t("trash.emptyTrash")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			<DataTable
				table={table}
				isLoading={isLoading}
				error={error}
				emptyMessage={t("trash.noItems")}
				emptyDescription={t("trash.noItemsDescription")}
			>
				<DataTableToolbar table={table}>
					<DataTableFilterMenu table={table} />
					<DataTableSortList table={table} />
				</DataTableToolbar>
			</DataTable>
		</div>
	);
}
