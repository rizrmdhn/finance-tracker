import type { AppRouter } from "@finance-tracker/api";
import { EmptyState } from "@finance-tracker/ui/components/empty-state";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@finance-tracker/ui/components/table";
import { cn } from "@finance-tracker/ui/lib/utils";
import { getCommonPinningStyles } from "@finance-tracker/utils";
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import type { TRPCClientErrorLike } from "@trpc/client";
import { AlertCircle } from "lucide-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
	table: TanstackTable<TData>;
	actionBar?: React.ReactNode;
	isLoading?: boolean;
	error?: TRPCClientErrorLike<AppRouter> | null;
	emptyMessage?: string;
	emptyDescription?: string;
}

export function DataTable<TData>({
	table,
	actionBar,
	children,
	className,
	isLoading = false,
	error = null,
	emptyMessage,
	emptyDescription,
	...props
}: DataTableProps<TData>) {
	const { t } = useTranslation();
	const resolvedEmptyMessage = emptyMessage ?? t("errors.noData");
	const resolvedEmptyDescription = emptyDescription ?? t("errors.noData");

	const columnCount = table.getAllColumns().length;

	return (
		<div
			className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
			{...props}
		>
			{children}
			<div className="overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										style={{
											...getCommonPinningStyles({ column: header.column }),
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 10 }).map((_, index) => (
								<TableRow key={index}>
									{Array.from({ length: columnCount }).map((_, cellIndex) => (
										<TableCell key={cellIndex}>
											<Skeleton className="h-6 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : error ? (
							<TableRow>
								<TableCell colSpan={columnCount} className="h-64">
									<EmptyState
										icon={<AlertCircle />}
										title={error.data?.code || t("errors.somethingWentWrong")}
										description={error.message}
									/>
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											style={{
												...getCommonPinningStyles({ column: cell.column }),
											}}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columnCount} className="h-64">
									<EmptyState
										icon={<AlertCircle />}
										title={resolvedEmptyMessage}
										description={resolvedEmptyDescription}
									/>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex flex-col gap-2.5">
				<DataTablePagination table={table} />
				{actionBar &&
					table.getFilteredSelectedRowModel().rows.length > 0 &&
					actionBar}
			</div>
		</div>
	);
}
