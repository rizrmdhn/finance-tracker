import { type AnyDatabase, recurrences } from "@finance-tracker/db";
import type {
	CreateRecurrenceInput,
	UpdateRecurrenceInput,
} from "@finance-tracker/schema";
import { and, eq, isNull, lte } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function getRecurrences(db: AnyDatabase) {
	return await db.query.recurrences.findMany({
		where: isNull(recurrences.deletedAt),
		with: {
			templateTransaction: {
				with: { category: true, account: true },
			},
		},
		orderBy: (r, { asc }) => [asc(r.nextRunAt)],
	});
}

export async function getRecurrenceById(db: AnyDatabase, id: string) {
	return await db.query.recurrences.findFirst({
		where: eq(recurrences.id, id),
	});
}

export async function getRecurrenceByTemplateId(
	db: AnyDatabase,
	templateTransactionId: string,
) {
	return await db.query.recurrences.findFirst({
		where: and(
			eq(recurrences.templateTransactionId, templateTransactionId),
			isNull(recurrences.deletedAt),
		),
	});
}

export async function getDueRecurrences(db: AnyDatabase) {
	const now = Date.now();
	return await db.query.recurrences.findMany({
		where: and(
			eq(recurrences.isActive, true),
			isNull(recurrences.deletedAt),
			lte(recurrences.nextRunAt, now),
		),
		with: { templateTransaction: true },
	});
}

export async function createRecurrence(
	db: AnyDatabase,
	input: CreateRecurrenceInput,
) {
	const [result] = await db.insert(recurrences).values(input).returning();

	if (!result) throw new Error("Failed to create recurrence");

	return result;
}

export async function updateRecurrence(
	db: AnyDatabase,
	input: UpdateRecurrenceInput,
) {
	const existing = await getRecurrenceById(db, input.id);

	if (!existing) throw new NotFoundError("Recurrence", input.id);

	const { id, ...data } = input;

	const [result] = await db
		.update(recurrences)
		.set(data)
		.where(eq(recurrences.id, id))
		.returning();

	if (!result) throw new Error("Failed to update recurrence");

	return result;
}

export async function deleteRecurrence(db: AnyDatabase, id: string) {
	const existing = await getRecurrenceById(db, id);

	if (!existing) throw new NotFoundError("Recurrence", id);

	const [result] = await db
		.delete(recurrences)
		.where(eq(recurrences.id, id))
		.returning();

	if (!result) throw new Error("Failed to delete recurrence");

	return result;
}

export async function toggleRecurrenceActive(db: AnyDatabase, id: string) {
	const existing = await getRecurrenceById(db, id);

	if (!existing) throw new NotFoundError("Recurrence", id);

	const [result] = await db
		.update(recurrences)
		.set({ isActive: !existing.isActive })
		.where(eq(recurrences.id, id))
		.returning();

	if (!result) throw new Error("Failed to toggle recurrence");

	return result;
}
