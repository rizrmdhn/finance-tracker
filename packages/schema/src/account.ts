import {
	ACCOUNT_TYPES,
	COLOR_VALUES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const accountSchema = z.object({
	name: z
		.string({ error: "validation.enterAccountName" })
		.min(1, { error: "validation.enterAccountName" }),
	icon: z.enum(ICON_NAMES, { error: "validation.selectIcon" }),
	color: z.enum(COLOR_VALUES, { error: "validation.selectColor" }),
	type: z.enum(ACCOUNT_TYPES, { error: "validation.selectAccountType" }),
	initialBalance: z
		.number({ error: "validation.enterInitialBalance" })
		.int({ error: "validation.enterInitialBalance" })
		.nonnegative({ error: "validation.enterInitialBalance" }),
	currency: z.enum(SUPPORTED_CURRENCIES, {
		error: "validation.selectCurrency",
	}),
});

export const accountUpdateSchema = accountSchema.partial().extend({
	id: z.string(),
});

export type Account = z.infer<typeof accountSchema>;

export type AccountInput = z.infer<typeof accountSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
