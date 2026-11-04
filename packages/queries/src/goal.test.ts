import { beforeEach, describe, expect, test } from "bun:test";
import { goalContributions, goals } from "@finance-tracker/db";
import { eq } from "drizzle-orm";
import {
	AccountAlreadyLinkedError,
	AccountIsContributionSourceError,
	AllocationLimitExceededError,
	GoalNotActiveError,
	InsufficientFreeBalanceError,
	LinkedAccountContributionError,
	RelationNotFoundError,
	WithdrawalExceedsAllocationError,
} from "./errors";
import {
	addGoalContribution,
	createGoal,
	deleteGoal,
	deleteGoalContribution,
	getGoalById,
	getGoalContributions,
	getGoals,
	updateGoal,
} from "./goal";
import {
	baseGoal,
	createTestDb,
	seedAccount,
	seedCategory,
	seedTransaction,
	type TestDb,
} from "./test-db";

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
			allocationPercent: 30,
		});
		const first = await createGoal(db, {
			...baseGoal,
			name: "A",
			priority: 0,
			allocationPercent: 30,
		});
		const deleted = await createGoal(db, {
			...baseGoal,
			name: "C",
			allocationPercent: 30,
		});
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

describe("goal contributions", () => {
	test("lists non-deleted contributions with their account, newest first", async () => {
		const account = await seedAccount(db, { initialBalance: 5_000_000 });
		const goal = await createGoal(db, baseGoal);
		const older = await addGoalContribution(db, {
			goalId: goal.id,
			accountId: account.id,
			amount: 100,
			date: 1,
		});
		const newer = await addGoalContribution(db, {
			goalId: goal.id,
			accountId: account.id,
			amount: 200,
			date: 2,
		});
		const removed = await addGoalContribution(db, {
			goalId: goal.id,
			accountId: account.id,
			amount: 300,
			date: 3,
		});
		await deleteGoalContribution(db, removed.id);

		const result = await getGoalContributions(db, goal.id);
		expect(result.map((c) => c.id)).toEqual([newer.id, older.id]);
		expect(result[0]?.account?.id).toBe(account.id);
	});
});

describe("goal guards", () => {
	async function archive(goalId: string) {
		await db
			.update(goals)
			.set({ status: "archived" })
			.where(eq(goals.id, goalId));
	}

	function contribute(goalId: string, accountId: string, amount: number) {
		return addGoalContribution(db, { goalId, accountId, amount, date: 1 });
	}

	describe("rule 1: linking an account", () => {
		test("rejects an account already linked to another active goal", async () => {
			const pocket = await seedAccount(db);
			const owner = await createGoal(db, {
				...baseGoal,
				linkedAccountId: pocket.id,
			});
			const other = await createGoal(db, baseGoal);

			await expect(
				createGoal(db, {
					...baseGoal,
					allocationPercent: 0,
					linkedAccountId: pocket.id,
				}),
			).rejects.toThrow(AccountAlreadyLinkedError);
			await expect(
				updateGoal(db, { id: other.id, linkedAccountId: pocket.id }),
			).rejects.toThrow(AccountAlreadyLinkedError);

			await archive(owner.id);
			const relinked = await updateGoal(db, {
				id: other.id,
				linkedAccountId: pocket.id,
			});
			expect(relinked.linkedAccountId).toBe(pocket.id);
		});

		test("rejects an account that funds active goals through contributions", async () => {
			const wallet = await seedAccount(db, { initialBalance: 1000 });
			const funded = await createGoal(db, baseGoal);
			await contribute(funded.id, wallet.id, 100);

			await expect(
				createGoal(db, { ...baseGoal, linkedAccountId: wallet.id }),
			).rejects.toThrow(AccountIsContributionSourceError);
			// the goal's own contributions count too
			await expect(
				updateGoal(db, { id: funded.id, linkedAccountId: wallet.id }),
			).rejects.toThrow(AccountIsContributionSourceError);

			await archive(funded.id);
			const goal = await createGoal(db, {
				...baseGoal,
				linkedAccountId: wallet.id,
			});
			expect(goal.linkedAccountId).toBe(wallet.id);
		});

		test("updateGoal re-links to a free account and keeps its own link on unrelated edits", async () => {
			const pocket = await seedAccount(db);
			const newPocket = await seedAccount(db);
			const goal = await createGoal(db, {
				...baseGoal,
				linkedAccountId: pocket.id,
			});

			const renamed = await updateGoal(db, {
				id: goal.id,
				name: "iPhone 17 Pro",
				linkedAccountId: pocket.id,
			});
			expect(renamed.name).toBe("iPhone 17 Pro");

			const relinked = await updateGoal(db, {
				id: goal.id,
				linkedAccountId: newPocket.id,
			});
			expect(relinked.linkedAccountId).toBe(newPocket.id);

			const unlinked = await updateGoal(db, {
				id: goal.id,
				linkedAccountId: null,
			});
			expect(unlinked.linkedAccountId).toBeNull();
		});

		test("rejects an unknown or deleted account", async () => {
			const deleted = await seedAccount(db, {
				deletedAt: new Date().toISOString(),
			});

			await expect(
				createGoal(db, { ...baseGoal, linkedAccountId: deleted.id }),
			).rejects.toThrow(RelationNotFoundError);
			await expect(
				createGoal(db, { ...baseGoal, linkedAccountId: "missing" }),
			).rejects.toThrow(RelationNotFoundError);
		});
	});

	describe("rule 2: linked accounts can't fund contributions", () => {
		test("rejects the linked account of another active goal as source", async () => {
			const pocket = await seedAccount(db, { initialBalance: 1000 });
			const owner = await createGoal(db, {
				...baseGoal,
				linkedAccountId: pocket.id,
			});
			const goal = await createGoal(db, baseGoal);

			await expect(contribute(goal.id, pocket.id, 100)).rejects.toThrow(
				LinkedAccountContributionError,
			);

			await archive(owner.id);
			const contribution = await contribute(goal.id, pocket.id, 100);
			expect(contribution.amount).toBe(100);
		});

		test("rejects an initial fund from the goal's own linked account and creates nothing", async () => {
			const pocket = await seedAccount(db, { initialBalance: 1000 });

			await expect(
				createGoal(db, {
					...baseGoal,
					linkedAccountId: pocket.id,
					initialFund: { accountId: pocket.id, amount: 100 },
				}),
			).rejects.toThrow(LinkedAccountContributionError);
			expect(await getGoals(db)).toEqual([]);
			expect(await db.select().from(goalContributions)).toEqual([]);
		});

		test("accepts an initial fund from another account", async () => {
			const pocket = await seedAccount(db, { initialBalance: 1000 });
			const wallet = await seedAccount(db, { initialBalance: 1000 });

			await createGoal(db, {
				...baseGoal,
				linkedAccountId: pocket.id,
				initialFund: { accountId: wallet.id, amount: 1000 },
			});
			expect(await db.select().from(goalContributions)).toHaveLength(1);
		});
	});

	describe("rule 4: allocations fit the balance", () => {
		test("a deposit must fit the free balance left by other active goals", async () => {
			const wallet = await seedAccount(db, { initialBalance: 1000 });
			const expense = await seedCategory(db, "expense");
			await seedTransaction(db, {
				accountId: wallet.id,
				categoryId: expense.id,
				amount: 200,
				date: 1,
			});
			const first = await createGoal(db, baseGoal);
			const second = await createGoal(db, baseGoal);
			await contribute(first.id, wallet.id, 500);

			// 1000 − 200 − 500 = 300 free
			await expect(contribute(second.id, wallet.id, 301)).rejects.toThrow(
				InsufficientFreeBalanceError,
			);
			const contribution = await contribute(second.id, wallet.id, 300);
			expect(contribution.amount).toBe(300);
		});

		test("an initial fund must fit the free balance", async () => {
			const wallet = await seedAccount(db, { initialBalance: 1000 });

			await expect(
				createGoal(db, {
					...baseGoal,
					initialFund: { accountId: wallet.id, amount: 1001 },
				}),
			).rejects.toThrow(InsufficientFreeBalanceError);
			expect(await getGoals(db)).toEqual([]);
		});

		test("archived goals no longer hold their allocations", async () => {
			const wallet = await seedAccount(db, { initialBalance: 1000 });
			const archived = await createGoal(db, baseGoal);
			const goal = await createGoal(db, baseGoal);
			await contribute(archived.id, wallet.id, 1000);

			await expect(contribute(goal.id, wallet.id, 1)).rejects.toThrow(
				InsufficientFreeBalanceError,
			);

			await archive(archived.id);
			const contribution = await contribute(goal.id, wallet.id, 1000);
			expect(contribution.amount).toBe(1000);
		});

		test("a withdrawal can't exceed what the goal holds from that account", async () => {
			const wallet = await seedAccount(db, { initialBalance: 1000 });
			const other = await seedAccount(db, { initialBalance: 1000 });
			const goal = await createGoal(db, baseGoal);
			const otherGoal = await createGoal(db, baseGoal);
			await contribute(goal.id, wallet.id, 300);
			await contribute(otherGoal.id, other.id, 500);

			await expect(contribute(goal.id, wallet.id, -301)).rejects.toThrow(
				WithdrawalExceedsAllocationError,
			);
			// what another goal holds from an account doesn't count
			await expect(contribute(goal.id, other.id, -1)).rejects.toThrow(
				WithdrawalExceedsAllocationError,
			);

			await contribute(goal.id, wallet.id, -100);
			const contribution = await contribute(goal.id, wallet.id, -200);
			expect(contribution.amount).toBe(-200);
			await expect(contribute(goal.id, wallet.id, -1)).rejects.toThrow(
				WithdrawalExceedsAllocationError,
			);
		});

		test("rejects an unknown or deleted source account", async () => {
			const deleted = await seedAccount(db, {
				initialBalance: 1000,
				deletedAt: new Date().toISOString(),
			});
			const goal = await createGoal(db, baseGoal);

			await expect(contribute(goal.id, deleted.id, 100)).rejects.toThrow(
				RelationNotFoundError,
			);
		});
	});

	describe("rule 5: allocation percent", () => {
		test("active goals allocate at most 100% together", async () => {
			const first = await createGoal(db, {
				...baseGoal,
				allocationPercent: 60,
			});

			await expect(
				createGoal(db, { ...baseGoal, allocationPercent: 41 }),
			).rejects.toThrow(AllocationLimitExceededError);
			const second = await createGoal(db, {
				...baseGoal,
				allocationPercent: 40,
			});

			await expect(
				updateGoal(db, { id: second.id, allocationPercent: 50 }),
			).rejects.toThrow(AllocationLimitExceededError);
			// lowering is always allowed, and a goal doesn't count against itself
			await updateGoal(db, { id: first.id, allocationPercent: 50 });
			const raised = await updateGoal(db, {
				id: second.id,
				allocationPercent: 50,
			});
			expect(raised.allocationPercent).toBe(50);
		});

		test("archived and deleted goals don't count", async () => {
			const archived = await createGoal(db, {
				...baseGoal,
				allocationPercent: 60,
			});
			const deleted = await createGoal(db, {
				...baseGoal,
				allocationPercent: 40,
			});
			await archive(archived.id);
			await deleteGoal(db, deleted.id);

			const goal = await createGoal(db, {
				...baseGoal,
				allocationPercent: 100,
			});
			expect(goal.allocationPercent).toBe(100);
		});
	});

	test("only active goals take contributions", async () => {
		const wallet = await seedAccount(db, { initialBalance: 1000 });
		const goal = await createGoal(db, baseGoal);
		await archive(goal.id);

		await expect(contribute(goal.id, wallet.id, 100)).rejects.toThrow(
			GoalNotActiveError,
		);
	});
});
