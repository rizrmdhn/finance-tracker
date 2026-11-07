import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	formatAmountInput,
	getAmountDecimalSeparator,
	parseAmountInput,
} from "@finance-tracker/utils";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useThemeColor } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

interface CurrencyInputProps {
	value?: number;
	onChange: (value: number | undefined) => void;
	currency?: SupportedCurrency;
	placeholder?: string;
	className?: string;
}

export function CurrencyInput({
	value,
	onChange,
	currency = "IDR",
	placeholder = "0",
	className,
}: CurrencyInputProps) {
	const mutedForeground = useThemeColor("mutedForeground");

	const hasDecimals = getAmountDecimalSeparator(currency) !== null;

	const [display, setDisplay] = useState(() =>
		formatAmountInput(value, currency),
	);
	const [focused, setFocused] = useState(false);
	const isFocused = useRef(false);

	useEffect(() => {
		if (!isFocused.current) {
			setDisplay(formatAmountInput(value, currency));
		}
	}, [value, currency]);

	function handleChangeText(text: string) {
		const parsed = parseAmountInput(text, currency);
		setDisplay(parsed.display);
		onChange(parsed.value);
	}

	function handleFocus() {
		isFocused.current = true;
		setFocused(true);
	}

	function handleBlur() {
		isFocused.current = false;
		setFocused(false);
		setDisplay(formatAmountInput(value, currency));
	}

	return (
		<View
			className={cn(
				"flex h-10 flex-row items-center rounded-md border border-input bg-background shadow-black/5 shadow-sm dark:bg-input/30",
				focused && "border-ring",
				className,
			)}
		>
			<Input
				className="flex-1 rounded-r-none rounded-l-md border-0 px-3 text-base text-foreground"
				style={{
					backgroundColor: "transparent",
					lineHeight: undefined,
					textAlignVertical: "center",
				}}
				keyboardType={hasDecimals ? "decimal-pad" : "numeric"}
				value={display}
				onChangeText={handleChangeText}
				onFocus={handleFocus}
				onBlur={handleBlur}
				placeholder={placeholder}
				placeholderTextColor={mutedForeground}
			/>
			<View className="h-full items-center justify-center border-input border-l px-3">
				<Text className="font-medium text-muted-foreground text-sm">
					{currency}
				</Text>
			</View>
		</View>
	);
}
