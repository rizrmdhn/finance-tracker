import {
	CATEGORY_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
} from "@finance-tracker/constants";
import { z } from "zod";

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
