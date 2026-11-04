// "Reached" is derived (progress >= targetAmount) and never stored
export const GOAL_STATUSES = ["active", "purchased", "archived"] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** Goal rule violations; each one has a translation at `goals.errors.<code>`. */
export const GOAL_ERROR_CODES = [
	"notActive",
	"accountAlreadyLinked",
	"accountIsContributionSource",
	"linkedAccountContribution",
	"insufficientFreeBalance",
	"withdrawalExceedsAllocation",
	"allocationLimitExceeded",
] as const;

export type GoalErrorCode = (typeof GOAL_ERROR_CODES)[number];
