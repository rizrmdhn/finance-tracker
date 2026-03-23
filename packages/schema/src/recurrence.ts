import { RECURRENCE_FREQUENCIES } from "@finance-tracker/constants";
import { z } from "zod";

export const createRecurrenceSchema = z.object({
	templateTransactionId: z.string(),
	frequency: z.enum(RECURRENCE_FREQUENCIES),
	nextRunAt: z.number(),
	endDate: z.number().optional(),
	isActive: z.boolean().optional(),
});

export const updateRecurrenceSchema = createRecurrenceSchema
	.partial()
	.omit({ templateTransactionId: true })
	.extend({ id: z.string() });

export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;
export type UpdateRecurrenceInput = z.infer<typeof updateRecurrenceSchema>;
