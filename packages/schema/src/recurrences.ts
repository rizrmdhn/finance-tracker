import { z } from "zod";

export const createRecurrenceSchema = z.object({
	templateTransactionId: z.string(),
	frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
	endDate: z.number().optional(),
});

export const updateRecurrenceSchema = createRecurrenceSchema
	.partial()
	.omit({ templateTransactionId: true })
	.extend({ id: z.string() });

export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;
export type UpdateRecurrenceInput = z.infer<typeof updateRecurrenceSchema>;
