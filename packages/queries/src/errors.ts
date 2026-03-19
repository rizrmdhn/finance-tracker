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
