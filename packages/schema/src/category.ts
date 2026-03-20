import {
	CATEGORY_COLORS,
	CATEGORY_ICONS,
	CATEGORY_TYPES,
} from "@finance-tracker/constants";
import { z } from "zod";

const ICON_NAMES = CATEGORY_ICONS.map((i) => i.name) as [string, ...string[]];
const COLOR_VALUES = CATEGORY_COLORS.map((c) => c.value) as [
	string,
	...string[],
];

export const categorySchema = z.object({
	name: z.string().min(1),
	icon: z.enum(ICON_NAMES).optional(),
	color: z.enum(COLOR_VALUES).optional(),
	type: z.enum(CATEGORY_TYPES),
});

export type CategoryInput = z.infer<typeof categorySchema>;
