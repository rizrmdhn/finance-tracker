import type { AnyDatabase } from "@finance-tracker/db";
import { categories } from "@finance-tracker/db";
import type { CategoryInput } from "@finance-tracker/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function getCategories(db: AnyDatabase) {
	return await db.query.categories.findMany();
}

export async function getCategoryById(db: AnyDatabase, id: string) {
	return await db.query.categories.findFirst({
		where: eq(categories.id, id),
	});
}

export async function createCategory(db: AnyDatabase, input: CategoryInput) {
	return await db.insert(categories).values(input).returning();
}

export async function deleteCategory(db: AnyDatabase, id: string) {
	const isExist = await getCategoryById(db, id);

	if (!isExist) {
		throw new NotFoundError("Category", id);
	}

	return await db.delete(categories).where(eq(categories.id, id));
}
