export class NotFoundError extends Error {
	constructor(entity: string, id: string) {
		super(`${entity} not found: ${id}`);
		this.name = "NotFoundError";
	}
}

export class QueryError extends Error {
	constructor(
		message: string,
		public cause?: unknown,
	) {
		super(message);
		this.name = "QueryError";
	}
}

// Unique constraint violation (e.g. duplicate category name)
export class ConflictError extends Error {
	constructor(entity: string, field: string, value: string) {
		super(`${entity} with ${field} "${value}" already exists`);
		this.name = "ConflictError";
	}
}

// Missing required relation (e.g. category not found when creating transaction)
export class RelationNotFoundError extends Error {
	constructor(entity: string, relatedEntity: string, id: string) {
		super(`${entity}: ${relatedEntity} not found: ${id}`);
		this.name = "RelationNotFoundError";
	}
}

// Goal lifecycle: only active goals take contributions, purchases or archiving
export class GoalNotActiveError extends Error {
	constructor(goalId: string, status: string) {
		super(`Goal ${goalId} is ${status}, only active goals can be changed`);
		this.name = "GoalNotActiveError";
	}
}

// An account can be the linked account of at most one active goal
export class AccountAlreadyLinkedError extends Error {
	constructor(accountId: string, goalId: string) {
		super(`Account ${accountId} is already linked to goal ${goalId}`);
		this.name = "AccountAlreadyLinkedError";
	}
}

// An account that funds active goals through contributions can't become a linked account
export class AccountIsContributionSourceError extends Error {
	constructor(accountId: string) {
		super(
			`Account ${accountId} funds active goals through contributions and can't be linked`,
		);
		this.name = "AccountIsContributionSourceError";
	}
}

// The linked account of an active goal can't fund contributions
export class LinkedAccountContributionError extends Error {
	constructor(accountId: string) {
		super(
			`Account ${accountId} is linked to a goal and can't fund contributions`,
		);
		this.name = "LinkedAccountContributionError";
	}
}

export class InsufficientFreeBalanceError extends Error {
	constructor(accountId: string, freeBalance: number, amount: number) {
		super(
			`Contribution of ${amount} exceeds the free balance (${freeBalance}) of account ${accountId}`,
		);
		this.name = "InsufficientFreeBalanceError";
	}
}

export class WithdrawalExceedsAllocationError extends Error {
	constructor(goalId: string, accountId: string, held: number, amount: number) {
		super(
			`Withdrawal of ${amount} exceeds the ${held} goal ${goalId} holds from account ${accountId}`,
		);
		this.name = "WithdrawalExceedsAllocationError";
	}
}

// SUM(allocationPercent) of active goals must stay ≤ 100
export class AllocationLimitExceededError extends Error {
	constructor(total: number) {
		super(`Active goals would allocate ${total}% of the surplus, max 100%`);
		this.name = "AllocationLimitExceededError";
	}
}
