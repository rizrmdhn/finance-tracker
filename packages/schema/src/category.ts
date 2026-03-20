import {
	CATEGORY_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const categorySchema = z.object({
	name: z.string().min(1),
	icon: z.enum(ICON_NAMES),
	color: z.enum(COLOR_VALUES),
	type: z.enum(CATEGORY_TYPES),
});

export const categoryUpdateSchema = categorySchema.partial().extend({
	id: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

export type CategoryInput = z.infer<typeof categorySchema>;

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
