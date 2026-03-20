import type { AnyDatabase } from "@finance-tracker/db";
import { categories } from "@finance-tracker/db";
import type {
	CategoryInput,
	CategoryUpdateInput,
} from "@finance-tracker/schema";
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
	const [result] = await db.insert(categories).values(input).returning();

	if (!result) {
		throw new Error("Failed to create category");
	}

	return result;
}

export async function updateCategory(
	db: AnyDatabase,
	input: CategoryUpdateInput,
) {
	const isExist = await getCategoryById(db, input.id);

	if (!isExist) {
		throw new NotFoundError("Category", input.id);
	}

	const [result] = await db
		.update(categories)
		.set(input)
		.where(eq(categories.id, input.id))
		.returning();

	if (!result) {
		throw new Error("Failed to update category");
	}

	return result;
}

export async function deleteCategory(db: AnyDatabase, id: string) {
	const isExist = await getCategoryById(db, id);

	if (!isExist) {
		throw new NotFoundError("Category", id);
	}

	const [result] = await db
		.delete(categories)
		.where(eq(categories.id, id))
		.returning();

	if (!result) {
		throw new Error("Failed to delete category");
	}

	return result;
}
