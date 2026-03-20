import type { Transaction } from "@finance-tracker/types";
import type { ColumnDef } from "@tanstack/react-table";
import {
	createActionColumn,
	createBadgeColumn,
	createDateColumn,
	createNumberColumn,
	createTextColumn,
} from "@/lib/column-helpers";
import { createCrudActionCell } from "@/lib/create-crud-action-cell";
import { trpc } from "@/lib/trpc";
import { Route } from "@/routes/transactions";

interface TransactionsColumnsProps {
	currentPage: number;
	perPage: number;
}

const ActionCell = createCrudActionCell<
	Transaction,
	(typeof Route)["types"]["searchSchema"]
>({
	resourceName: "transaction",
	deleteMutation: trpc.transaction.delete,
	getQueryOptions: (params) => trpc.transaction.paginated.queryOptions(params),
	useSearchParams: () => Route.useSearch(),
});

export default function getTransactionsColumns({
	currentPage,
	perPage,
}: TransactionsColumnsProps): ColumnDef<Transaction>[] {
	return [
		createNumberColumn<Transaction>(currentPage, perPage),
		createTextColumn<Transaction>("amount", "Judul", {
			width: "w-32",
			enableFilter: true,
		}),
		createTextColumn<Transaction>("note", "Urutan", {
			width: "w-24",
		}),
		createBadgeColumn<Transaction>("tags", "Aktif", {
			valueIsBoolean: true,
		}),
		createDateColumn<Transaction>("createdAt", "Dibuat"),
		createDateColumn<Transaction>("updatedAt", "Diubah", {
			nullable: true,
		}),
		createActionColumn<Transaction>(({ row }) => <ActionCell row={row} />),
	];
}
