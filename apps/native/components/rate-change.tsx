import { getRateChangeDirection } from "@finance-tracker/utils";
import { View } from "react-native";
import {
	RATE_CHANGE_STYLES,
	useExchangeRateText,
} from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";
import { Icon } from "./ui/icon";
import { Text } from "./ui/text";

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
		return (
			<Text className={cn("text-muted-foreground text-sm", className)}>—</Text>
		);
	}

	const style = RATE_CHANGE_STYLES[getRateChangeDirection(changePercent)];
	return (
		<View className="flex-row items-center gap-1">
			<Icon as={style.Icon} className={cn("size-3.5", style.className)} />
			<Text className={cn("text-sm tabular-nums", style.className, className)}>
				{formatChange(changePercent)}
			</Text>
		</View>
	);
}
