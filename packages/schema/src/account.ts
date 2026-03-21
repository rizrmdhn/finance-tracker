import {
	ACCOUNT_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const accountSchema = z.object({
	name: z
		.string({ error: "Please enter a valid account name" })
		.min(1, { error: "Please enter a valid account name" }),
	icon: z.enum(ICON_NAMES, { error: "Please select an icon" }),
	color: z.enum(COLOR_VALUES, { error: "Please select a color" }),
	type: z.enum(ACCOUNT_TYPES, { error: "Please select an account type" }),
	initialBalance: z
		.number({ error: "Please enter a valid initial balance" })
		.int({ error: "Please enter a valid initial balance" })
		.nonnegative({ error: "Please enter a valid initial balance" }),
	currency: z.enum(SUPPORTED_CURRENCIES, { error: "Please select a currency" }),
});

export const accountUpdateSchema = accountSchema.partial().extend({
	id: z.string(),
});

export type Account = z.infer<typeof accountSchema>;

export type AccountInput = z.infer<typeof accountSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
