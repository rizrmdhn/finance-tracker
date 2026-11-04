import { beforeEach, describe, expect, test } from "bun:test";
import { goalContributions } from "@finance-tracker/db";
import type { GoalInput } from "@finance-tracker/schema";
import {
	createGoal,
	deleteGoal,
	getGoalById,
	getGoals,
	updateGoal,
} from "./goal";
import { createTestDb, seedAccount, type TestDb } from "./test-db";

const baseGoal: GoalInput = {
	name: "iPhone 17",
	icon: "Gift",
	color: "#ef4444",
	targetAmount: 15_000_000,
	currency: "IDR",
	allocationPercent: 50,
	priority: 0,
};

let db: TestDb;

beforeEach(() => {
	db = createTestDb();
});

describe("goal CRUD", () => {
	test("createGoal stores the initial fund as the first contribution", async () => {
		const account = await seedAccount(db, { initialBalance: 5_000_000 });
		const goal = await createGoal(db, {
			...baseGoal,
			initialFund: { accountId: account.id, amount: 1_000_000 },
		});

		const contributions = await db.select().from(goalContributions);
		expect(contributions).toHaveLength(1);
		expect(contributions[0]).toMatchObject({
			goalId: goal.id,
			accountId: account.id,
			amount: 1_000_000,
		});
	});

	test("getGoals orders by priority and skips deleted goals", async () => {
		const second = await createGoal(db, {
			...baseGoal,
			name: "B",
			priority: 1,
		});
		const first = await createGoal(db, { ...baseGoal, name: "A", priority: 0 });
		const deleted = await createGoal(db, { ...baseGoal, name: "C" });
		await deleteGoal(db, deleted.id);

		const result = await getGoals(db);
		expect(result.map((g) => g.id)).toEqual([first.id, second.id]);
		expect(await getGoalById(db, deleted.id)).toBeUndefined();
	});

	test("updateGoal can clear nullable fields", async () => {
		const goal = await createGoal(db, {
			...baseGoal,
			targetDate: Date.now(),
			productUrl: "https://example.com",
		});
		const updated = await updateGoal(db, {
			id: goal.id,
			targetDate: null,
			productUrl: null,
		});
		expect(updated.targetDate).toBeNull();
		expect(updated.productUrl).toBeNull();
	});
});
