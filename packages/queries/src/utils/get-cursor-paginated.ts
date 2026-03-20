import type { AnyDatabase } from "@finance-tracker/db";
import type {
	ExtendedColumnFilter,
	JoinOperator,
} from "@finance-tracker/types";
import { filterColumns, tryCatchAsync } from "@finance-tracker/utils";
import {
	and,
	asc,
	desc,
	gt,
	gte,
	isNotNull,
	isNull,
	lt,
	lte,
	type SQL,
	type Table,
} from "drizzle-orm";

interface CursorPaginatedInput {
	cursor?: string;
	limit: number;
	sort: { id: string; desc: boolean };
	filters: unknown[];
	joinOperator: JoinOperator;
	showDeleted: boolean;
	createdAt: number[];
}

interface GetCursorPaginatedOptions<T extends Table> {
	db: AnyDatabase;
	table: T;
	input: CursorPaginatedInput;
	/** The column to use for cursor pagination (defaults to "id") */
	cursorColumn?: string;
	/** Additional where conditions (e.g. eq on userId) */
	conditions?: (SQL | undefined)[];
}

export async function getCursorPaginated<T extends Table>({
	db,
	table,
	input,
	cursorColumn = "id",
	conditions = [],
}: GetCursorPaginatedOptions<T>) {
	const advancedTable = input.filters && input.filters.length > 0;

	// Build cursor condition
	const cursorCondition = input.cursor
		? input.sort.desc
			? lt(
					(table as Record<string, unknown>)[cursorColumn] as SQL,
					input.cursor,
				)
			: gt(
					(table as Record<string, unknown>)[cursorColumn] as SQL,
					input.cursor,
				)
		: undefined;

	const where = advancedTable
		? and(
				cursorCondition,
				filterColumns({
					table,
					filters: input.filters as ExtendedColumnFilter<T>[],
					joinOperator: input.joinOperator ?? "and",
				}),
			)
		: and(
				cursorCondition,
				...(conditions ?? []),
				input.createdAt.length > 0
					? and(
							input.createdAt[0]
								? gte(
										(table as Record<string, unknown>).createdAt as SQL,
										(() => {
											const date = new Date(input.createdAt[0]);
											date.setHours(0, 0, 0, 0);
											return date.toISOString();
										})(),
									)
								: undefined,
							input.createdAt[1]
								? lte(
										(table as Record<string, unknown>).createdAt as SQL,
										(() => {
											const date = new Date(input.createdAt[1]);
											date.setHours(23, 59, 59, 999);
											return date.toISOString();
										})(),
									)
								: undefined,
						)
					: undefined,
				input.showDeleted
					? isNotNull((table as Record<string, unknown>).deletedAt as SQL)
					: isNull((table as Record<string, unknown>).deletedAt as SQL),
			);

	// Add compound cursor for non-id sorts
	const orderBy = [
		input.sort.desc
			? desc((table as Record<string, unknown>)[input.sort.id] as SQL)
			: asc((table as Record<string, unknown>)[input.sort.id] as SQL),
		// Secondary sort for stability
		asc((table as Record<string, unknown>)[cursorColumn] as SQL),
	];

	const [result, err] = await tryCatchAsync(() =>
		db
			.select()
			.from(table)
			.limit(input.limit + 1)
			.where(where)
			.orderBy(...orderBy),
	);

	if (err) throw err;

	const data = result;

	const hasMore = data.length > input.limit;
	const items = hasMore ? data.slice(0, input.limit) : data;
	const nextCursor = hasMore
		? ((items[items.length - 1] as Record<string, unknown>)[
				cursorColumn
			] as string)
		: null;

	return {
		data: items,
		nextCursor,
		hasMore,
	};
}
