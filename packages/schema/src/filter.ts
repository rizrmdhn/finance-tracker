import { z } from "zod";

export const filterSchema = z.object({
	id: z.string(),
	value: z.any(),
	variant: z.string(),
	operator: z.string(),
	filterId: z.string(),
});
