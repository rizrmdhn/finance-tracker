import type { GoalStatus } from "@finance-tracker/constants";

/** An account's goal allocation state, as `goal.getAccountAllocations` returns it. */
interface AccountAllocation {
	accountId: string;
	allocated: number;
	freeBalance: number;
	isLinked: boolean;
	linkedGoalId: string | null;
}

/**
 * Non-deleted accounts with their goal allocation state. Rule 1: an account can be linked when no
 * other active goal links it and nothing is set aside from it. Linked accounts can't fund goals.
 */
export function getGoalAccountOptions<
	A extends { id: string; deletedAt: string | null },
>(accounts: A[], allocations: AccountAllocation[], goalId?: string) {
	const byAccount = new Map(allocations.map((a) => [a.accountId, a]));
	return accounts
		.filter((account) => !account.deletedAt)
		.map((account) => {
			const allocation = byAccount.get(account.id);
			const linkedElsewhere =
				!!allocation?.isLinked && allocation.linkedGoalId !== goalId;
			return {
				account,
				freeBalance: allocation?.freeBalance ?? 0,
				isLinked: allocation?.isLinked ?? false,
				canLink: !linkedElsewhere && (allocation?.allocated ?? 0) <= 0,
			};
		});
}

/**
 * Rule 5: the share of the surplus the other active goals leave free (≥ 0), and the priority
 * that puts a new goal last.
 */
export function getGoalAllocationDefaults(
	goals: {
		id: string;
		status: GoalStatus;
		allocationPercent: number;
		priority: number;
	}[],
	goalId?: string,
) {
	const others = goals.filter((g) => g.status === "active" && g.id !== goalId);
	return {
		availablePercent: Math.max(
			100 - others.reduce((sum, g) => sum + g.allocationPercent, 0),
			0,
		),
		nextPriority: Math.max(-1, ...others.map((g) => g.priority)) + 1,
	};
}

export type GoalContributionMode = "setAside" | "withdraw";

/**
 * Accounts a contribution can use, with the most it can move (in the account's currency).
 * Set aside: rule 2, no linked account can fund a goal; the max is the free balance.
 * Withdraw: only accounts the goal holds money from; the max is what it holds there.
 */
export function getGoalContributionOptions<A extends { id: string }>(
	mode: GoalContributionMode,
	{
		accountOptions,
		accounts,
		contributions,
	}: {
		/** From `getGoalAccountOptions`. */
		accountOptions: { account: A; freeBalance: number; isLinked: boolean }[];
		accounts: A[];
		/** The goal's `progress.contributions`. */
		contributions: { accountId: string; held: number }[];
	},
): { account: A; max: number }[] {
	if (mode === "setAside")
		return accountOptions
			.filter((a) => !a.isLinked)
			.map(({ account, freeBalance }) => ({ account, max: freeBalance }));

	return contributions.flatMap(({ accountId, held }) => {
		const account = accounts.find((a) => a.id === accountId);
		return account && held > 0 ? [{ account, max: held }] : [];
	});
}

/** Where a purchase payment row comes from; it only labels the row. */
export type GoalPaymentSource = "linked" | "setAside" | "shortfall" | "other";

/**
 * A purchase's pre-filled payments: the linked account's balance (its own currency), each
 * contribution source's held amount, plus a row without an account for any shortfall (goal
 * currency) — or for the whole target when nothing holds money yet.
 */
export function getDefaultGoalPayments(
	goal: { linkedAccountId: string | null; targetAmount: number },
	progress: {
		total: number;
		contributions: { accountId: string; held: number }[];
	},
	linkedBalance: number,
) {
	const payments: {
		accountId?: string;
		amount?: number;
		source: GoalPaymentSource;
	}[] = [];
	if (goal.linkedAccountId && linkedBalance > 0)
		payments.push({
			accountId: goal.linkedAccountId,
			amount: linkedBalance,
			source: "linked",
		});
	for (const c of progress.contributions)
		if (c.held > 0)
			payments.push({
				accountId: c.accountId,
				amount: c.held,
				source: "setAside",
			});
	const shortfall = goal.targetAmount - progress.total;
	if (shortfall > 0 || payments.length === 0)
		payments.push({
			amount: shortfall > 0 ? shortfall : undefined,
			source: "shortfall",
		});
	return payments;
}

/** What the target leaves for payment `index` after all the other payments (goal currency, ≥ 0). */
export function getGoalPaymentRemaining(
	targetAmount: number,
	paymentsInGoalCurrency: number[],
	index: number,
) {
	const others = paymentsInGoalCurrency.reduce(
		(sum, amount, i) => (i === index ? sum : sum + amount),
		0,
	);
	return Math.max(targetAmount - others, 0);
}
