import type { Transaction } from "@finance-tracker/types";
import type { ColumnDef } from "@tanstack/react-table";
import {
	createActionColumn,
	createDateColumn,
	createNumberColumn,
	createPriceColumn,
	createTagsColumn,
	createTextColumn,
} from "@/lib/column-helpers";
import { createCrudActionCell } from "@/lib/create-crud-action-cell";
import { trpc } from "@/lib/trpc";
import { Route } from "@/routes/transactions";

interface TransactionsColumnsProps {
	currentPage: number;
	perPage: number;
	onEdit: (row: Transaction) => void;
}

export default function getTransactionsColumns({
	currentPage,
	perPage,
	onEdit,
}: TransactionsColumnsProps): ColumnDef<Transaction>[] {
	const ActionCell = createCrudActionCell<
		Transaction,
		(typeof Route)["types"]["searchSchema"]
	>({
		resourceName: "transaction",
		deleteMutation: trpc.transaction.delete,
		getQueryOptions: (params) =>
			trpc.transaction.paginated.queryOptions(params),
		useSearchParams: () => Route.useSearch(),
		onEdit,
	});

	return [
		createNumberColumn<Transaction>(currentPage, perPage),
		createPriceColumn<Transaction>("amount", "Jumlah", {
			width: "w-32",
			enableFilter: true,
		}),
		createTextColumn<Transaction>("note", "Catatan", {
			width: "w-24",
		}),
		createTagsColumn<Transaction>("tags", "Tag"),
		createDateColumn<Transaction>("createdAt", "Dibuat"),
		createDateColumn<Transaction>("updatedAt", "Diubah", {
			nullable: true,
		}),
		createActionColumn<Transaction>(({ row }) => <ActionCell row={row} />),
	];
}
