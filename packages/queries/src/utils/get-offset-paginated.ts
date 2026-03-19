import type { AnyDatabase } from "@finance-tracker/db";
import { and, asc, count, desc, type SQL, type Table } from "drizzle-orm";

interface OffsetPaginatedInput {
	page: number;
	limit: number;
	sort: { id: string; desc: boolean };
}

interface GetOffsetPaginatedOptions<T extends Table> {
	db: AnyDatabase;
	table: T;
	input: OffsetPaginatedInput;
	/** Additional where conditions (e.g. eq on userId) */
	conditions?: (SQL | undefined)[];
}

export async function getOffsetPaginated<T extends Table>({
	db,
	table,
	input,
	conditions = [],
}: GetOffsetPaginatedOptions<T>) {
	const where = and(...conditions);

	const sortCol = (table as Record<string, unknown>)[input.sort.id] as SQL;

	const orderBy = input.sort.desc ? desc(sortCol) : asc(sortCol);

	const offset = (input.page - 1) * input.limit;

	const [data, [totalResult]] = await Promise.all([
		db
			.select()
			.from(table)
			.limit(input.limit)
			.offset(offset)
			.where(where)
			.orderBy(orderBy),
		db.select({ count: count() }).from(table).where(where),
	]);

	const total = totalResult?.count ?? 0;
	const pageCount = Math.ceil(total / input.limit);

	return {
		data,
		total,
		pageCount,
		page: input.page,
	};
}
