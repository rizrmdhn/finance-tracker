import {
	type AnyDatabase,
	goalContributions,
	goals,
} from "@finance-tracker/db";
import type {
	GoalContributionInput,
	GoalInput,
	GoalUpdateInput,
} from "@finance-tracker/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { NotFoundError } from "./errors";
import { withTransaction } from "./utils/with-transaction";

export async function getGoals(db: AnyDatabase) {
	return await db.query.goals.findMany({
		where: isNull(goals.deletedAt),
		orderBy: [asc(goals.priority), asc(goals.createdAt)],
	});
}

export async function getGoalById(db: AnyDatabase, id: string) {
	return await db.query.goals.findFirst({
		where: and(eq(goals.id, id), isNull(goals.deletedAt)),
	});
}

export async function createGoal(db: AnyDatabase, input: GoalInput) {
	const { initialFund, ...data } = input;

	return await withTransaction(db, async () => {
		const [goal] = await db.insert(goals).values(data).returning();

		if (!goal) throw new Error("Failed to create goal");

		if (initialFund) {
			await db.insert(goalContributions).values({
				goalId: goal.id,
				accountId: initialFund.accountId,
				amount: initialFund.amount,
				date: Date.now(),
			});
		}

		return goal;
	});
}

export async function updateGoal(db: AnyDatabase, input: GoalUpdateInput) {
	const { id, ...data } = input;

	const goal = await getGoalById(db, id);

	if (!goal) throw new NotFoundError("Goal", id);

	const [result] = await db
		.update(goals)
		.set(data)
		.where(eq(goals.id, id))
		.returning();

	if (!result) throw new Error("Failed to update goal");

	return result;
}

export async function deleteGoal(db: AnyDatabase, id: string) {
	const goal = await getGoalById(db, id);

	if (!goal) throw new NotFoundError("Goal", id);

	const [result] = await db
		.update(goals)
		.set({ deletedAt: new Date().toISOString() })
		.where(eq(goals.id, id))
		.returning();

	if (!result) throw new Error("Failed to delete goal");

	return result;
}

export async function addGoalContribution(
	db: AnyDatabase,
	input: GoalContributionInput,
) {
	const goal = await getGoalById(db, input.goalId);

	if (!goal) throw new NotFoundError("Goal", input.goalId);

	const [result] = await db.insert(goalContributions).values(input).returning();

	if (!result) throw new Error("Failed to add goal contribution");

	return result;
}

export async function getGoalContributions(db: AnyDatabase, goalId: string) {
	return await db.query.goalContributions.findMany({
		where: and(
			eq(goalContributions.goalId, goalId),
			isNull(goalContributions.deletedAt),
		),
		with: { account: true },
		orderBy: desc(goalContributions.date),
	});
}

export async function deleteGoalContribution(db: AnyDatabase, id: string) {
	const contribution = await db.query.goalContributions.findFirst({
		where: and(
			eq(goalContributions.id, id),
			isNull(goalContributions.deletedAt),
		),
	});

	if (!contribution) throw new NotFoundError("Goal contribution", id);

	const [result] = await db
		.update(goalContributions)
		.set({ deletedAt: new Date().toISOString() })
		.where(eq(goalContributions.id, id))
		.returning();

	if (!result) throw new Error("Failed to delete goal contribution");

	return result;
}
