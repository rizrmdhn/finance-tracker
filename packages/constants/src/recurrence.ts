export const RECURRENCE_FREQUENCIES = [
	"daily",
	"weekly",
	"monthly",
	"yearly",
] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const REUCRRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> =
	{
		daily: "Daily",
		weekly: "Weekly",
		monthly: "Monthly",
		yearly: "Yearly",
	};
