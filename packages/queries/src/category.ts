import type * as schema from "@finance-tracker/db";
import { categories } from "@finance-tracker/db";
import type { CategoryInput } from "@finance-tracker/schema";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { NotFoundError } from "./errors";

type Db = BetterSQLite3Database<typeof schema>;

export async function getCategories(db: Db) {
	return await db.query.categories.findMany();
}

export async function getCategoryById(db: Db, id: string) {
	return await db.query.categories.findFirst({
		where: eq(categories.id, id),
	});
}

export async function createCategory(db: Db, input: CategoryInput) {
	return await db.insert(categories).values(input).returning();
}

export async function deleteCategory(db: Db, id: string) {
	const isExist = await getCategoryById(db, id);

	if (!isExist) {
		throw new NotFoundError("Category", id);
	}

	return await db.delete(categories).where(eq(categories.id, id));
}
