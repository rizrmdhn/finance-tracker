/** Chart ranges for rate history; the source is daily, so there is nothing shorter than a week. */
export const EXCHANGE_RATE_RANGES = [
	"1W",
	"1M",
	"3M",
	"6M",
	"1Y",
	"5Y",
] as const;

export type ExchangeRateRange = (typeof EXCHANGE_RATE_RANGES)[number];
