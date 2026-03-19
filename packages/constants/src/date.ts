export const DATE_PERIODS = ["week", "month", "year", "all"] as const;
export type DatePeriod = (typeof DATE_PERIODS)[number];

export const DATE_PERIOD_LABELS: Record<DatePeriod, string> = {
	week: "This Week",
	month: "This Month",
	year: "This Year",
	all: "All Time",
};
