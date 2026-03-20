import { text } from "drizzle-orm/sqlite-core";

export const timestamp = {
	createdAt: text("created_at").$default(() => new Date().toISOString()),
	updatedAt: text("updated_at").$onUpdate(() => new Date().toISOString()),
	deletedAt: text("deleted_at"),
};
