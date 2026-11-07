import {
	COLOR_VALUES,
	ICON_NAMES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { z } from "zod";

export const goalSchema = z.object({
	name: z
		.string({ error: "validation.enterGoalName" })
		.min(1, { error: "validation.enterGoalName" }),
	icon: z.enum(ICON_NAMES, { error: "validation.selectIcon" }),
	color: z.enum(COLOR_VALUES, { error: "validation.selectColor" }),
	imageUri: z.string().nullish(),
	productUrl: z.url({ error: "validation.enterUrl" }).nullish(),
	targetAmount: z
		.number({ error: "validation.targetAmountRequired" })
		.positive({ error: "validation.targetAmountPositive" }),
	currency: z.enum(SUPPORTED_CURRENCIES, {
		error: "validation.selectCurrency",
	}),
	targetDate: z.number({ error: "validation.enterDate" }).nullish(),
	linkedAccountId: z.string().nullish(),
	allocationPercent: z
		.number({ error: "validation.allocationRequired" })
		.min(0, { error: "validation.allocationRange" })
		.max(100, { error: "validation.allocationRange" }),
	priority: z
		.number({ error: "validation.priorityRequired" })
		.int({ error: "validation.priorityWholeNumber" })
		.nonnegative({ error: "validation.priorityWholeNumber" }),
	initialFund: z
		.object({
			amount: z
				.number({ error: "validation.amountRequired" })
				.positive({ error: "validation.amountPositive" }),
			accountId: z.string({ error: "validation.accountRequired" }),
		})
		.optional(),
});

export const goalUpdateSchema = goalSchema
	.omit({ initialFund: true })
	.partial()
	.extend({ id: z.string() });

export const goalContributionSchema = z.object({
	goalId: z.string({ error: "validation.goalRequired" }),
	accountId: z.string({ error: "validation.accountRequired" }),
	amount: z
		.number({ error: "validation.amountRequired" })
		.refine((amount) => amount !== 0, { error: "validation.amountNotZero" }),
	note: z.string().optional(),
	date: z.number({ error: "validation.dateRequired" }),
});

export const goalPurchaseSchema = z.object({
	goalId: z.string({ error: "validation.goalRequired" }),
	payments: z
		.array(
			z.object({
				accountId: z.string({ error: "validation.accountRequired" }),
				amount: z
					.number({ error: "validation.amountRequired" })
					.positive({ error: "validation.amountPositive" }),
			}),
		)
		.min(1, { error: "validation.addPayment" }),
	date: z.number({ error: "validation.dateRequired" }),
	categoryId: z.string({ error: "validation.categoryRequired" }),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
export type GoalPurchaseInput = z.infer<typeof goalPurchaseSchema>;
