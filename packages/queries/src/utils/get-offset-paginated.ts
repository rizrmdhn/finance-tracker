import type { AnyDatabase } from "@finance-tracker/db";
import type { ExtendedColumnFilter } from "@finance-tracker/types";
import { filterColumns, tryCatchAsync } from "@finance-tracker/utils";
import {
	and,
	asc,
	count,
	desc,
	gte,
	isNotNull,
	isNull,
	lte,
	type SQL,
	type Table,
} from "drizzle-orm";

interface OffsetPaginatedInput {
	page: number;
	limit: number;
	sort: { id: string; desc: boolean }[];
	filters: unknown[];
	joinOperator: "and" | "or";
	showDeleted: boolean;
	createdAt: number[];
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
	const offset = (input.page - 1) * input.limit;
	const advancedTable = input.filters && input.filters.length > 0;

	const where = advancedTable
		? filterColumns({
				table,
				filters: input.filters as ExtendedColumnFilter<T>[],
				joinOperator: input.joinOperator ?? "and",
			})
		: and(
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

	const orderBy =
		input.sort.length > 0
			? input.sort.map((item) =>
					item.desc
						? desc((table as Record<string, unknown>)[item.id] as SQL)
						: asc((table as Record<string, unknown>)[item.id] as SQL),
				)
			: [desc((table as Record<string, unknown>).createdAt as SQL)];

	const [data, dataErr] = await tryCatchAsync(() =>
		db
			.select()
			.from(table)
			.limit(input.limit)
			.offset(offset)
			.where(where)
			.orderBy(...orderBy),
	);
	if (dataErr) throw dataErr;

	const [totalResult, totalErr] = await tryCatchAsync(() =>
		db.select({ count: count() }).from(table).where(where),
	);
	if (totalErr) throw totalErr;

	const total = totalResult?.[0]?.count ?? 0;
	const pageCount = Math.ceil(total / input.limit);

	return {
		data,
		total,
		pageCount,
		page: input.page,
	};
}
