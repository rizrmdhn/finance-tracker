import { cn } from "@finance-tracker/ui/lib/utils";
import { getRateChangeDirection } from "@finance-tracker/utils";
import { RATE_CHANGE_STYLES, useExchangeRateText } from "./exchange-rate-utils";

/** A coloured "▲ 2.14%" for a change over the selected range; "—" without one. */
export function RateChange({
	changePercent,
	className,
}: {
	changePercent: number | null;
	className?: string;
}) {
	const { formatChange } = useExchangeRateText();
	if (changePercent === null) {
		return <span className="text-muted-foreground">—</span>;
	}

	const style = RATE_CHANGE_STYLES[getRateChangeDirection(changePercent)];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 tabular-nums",
				style.className,
				className,
			)}
		>
			<style.Icon className="size-3.5" />
			{formatChange(changePercent)}
		</span>
	);
}
