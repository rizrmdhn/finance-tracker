import {
	CATEGORY_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
} from "@finance-tracker/constants";
import type { categories } from "@finance-tracker/db";
import { z } from "zod";
import { createPaginationSchema } from "./pagination";

export const categorySchema = z.object({
	name: z.string().min(1),
	icon: z.enum(ICON_NAMES, { error: "Please select an icon" }),
	color: z.enum(COLOR_VALUES, { error: "Please select a color" }),
	type: z.enum(CATEGORY_TYPES, { error: "Please select a category type" }),
});

export const categoryUpdateSchema = categorySchema.partial().extend({
	id: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

export type CategoryInput = z.infer<typeof categorySchema>;

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

const CATEGORY_SORTABLE_FIELDS = [
	"name",
	"type",
	"createdAt",
	"updatedAt",
] as const satisfies readonly (keyof typeof categories.$inferSelect)[];

export const paginatedCategoriesSchema = createPaginationSchema(
	CATEGORY_SORTABLE_FIELDS,
);

export type PaginatedCategoriesInput = z.infer<
	typeof paginatedCategoriesSchema
>;
