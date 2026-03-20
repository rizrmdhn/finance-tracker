import {
	ACCOUNT_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const accountSchema = z.object({
	name: z.string().min(1),
	icon: z.enum(ICON_NAMES),
	color: z.enum(COLOR_VALUES),
	type: z.enum(ACCOUNT_TYPES),
	initialBalance: z.number().int().nonnegative(),
	currency: z.enum(SUPPORTED_CURRENCIES),
});

export const accountUpdateSchema = accountSchema.partial().extend({
	id: z.string(),
});

export type Account = z.infer<typeof accountSchema>;

export type AccountInput = z.infer<typeof accountSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
