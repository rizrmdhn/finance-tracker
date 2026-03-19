import { CATEGORY_TYPES } from "@finance-tracker/constants";
import { z } from "zod";

export const categorySchema = z.object({
	name: z.string().min(1),
	icon: z.string().optional(),
	color: z.string().optional(),
	type: z.enum(CATEGORY_TYPES),
});

export type CategoryInput = z.infer<typeof categorySchema>;
