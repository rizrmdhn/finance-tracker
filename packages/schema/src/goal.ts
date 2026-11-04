import {
	COLOR_VALUES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const goalSchema = z.object({
	name: z
		.string({ error: "Please enter a valid goal name" })
		.min(1, { error: "Please enter a valid goal name" }),
	icon: z.enum(ICON_NAMES, { error: "Please select an icon" }),
	color: z.enum(COLOR_VALUES, { error: "Please select a color" }),
	imageUri: z.string().optional(),
	productUrl: z.url({ error: "Please enter a valid URL" }).optional(),
	targetAmount: z
		.number({ error: "Target amount is required" })
		.positive({ error: "Target amount must be greater than 0" }),
	currency: z.enum(SUPPORTED_CURRENCIES, { error: "Please select a currency" }),
	targetDate: z.number({ error: "Please provide a valid date" }).optional(),
	linkedAccountId: z.string().nullish(),
	allocationPercent: z
		.number({ error: "Allocation is required" })
		.min(0, { error: "Allocation must be between 0 and 100" })
		.max(100, { error: "Allocation must be between 0 and 100" }),
	priority: z
		.number({ error: "Priority is required" })
		.int({ error: "Priority must be a whole number" })
		.nonnegative({ error: "Priority must be a whole number" }),
	initialFund: z
		.object({
			amount: z
				.number({ error: "Amount is required" })
				.positive({ error: "Amount must be greater than 0" }),
			accountId: z.string({ error: "Account is required" }),
		})
		.optional(),
});

export const goalUpdateSchema = goalSchema
	.omit({ initialFund: true })
	.partial()
	.extend({ id: z.string() });

export type GoalInput = z.infer<typeof goalSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
