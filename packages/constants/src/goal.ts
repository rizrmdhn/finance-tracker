// "Reached" is derived (progress >= targetAmount) and never stored
export const GOAL_STATUSES = ["active", "purchased", "archived"] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];
