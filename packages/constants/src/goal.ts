export const GOAL_STATUSES = [
	"active",
	"achieved",
	"purchased",
	"archived",
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];
