import type { AnyDatabase } from "@finance-tracker/db";
import { and, asc, desc, gt, lt, type SQL, type Table } from "drizzle-orm";

interface CursorPaginatedInput {
	cursor?: string;
	limit: number;
	sort: { id: string; desc: boolean };
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
	const col = (table as Record<string, unknown>)[cursorColumn] as SQL;

	const cursorCondition = input.cursor
		? input.sort.desc
			? lt(col, input.cursor)
			: gt(col, input.cursor)
		: undefined;

	const where = and(cursorCondition, ...conditions);

	const sortCol = (table as Record<string, unknown>)[input.sort.id] as SQL;

	const orderBy = [input.sort.desc ? desc(sortCol) : asc(sortCol), asc(col)];

	const data = await db
		.select()
		.from(table)
		.limit(input.limit + 1)
		.where(where)
		.orderBy(...orderBy);

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
