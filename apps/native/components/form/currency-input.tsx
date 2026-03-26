import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const format = (n: number) =>
	new Intl.NumberFormat("id-ID", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n);

interface CurrencyInputProps {
	value?: number;
	onChange: (value: number | undefined) => void;
	currency?: string;
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
	const [display, setDisplay] = useState(
		value !== undefined ? format(value) : "",
	);
	const [focused, setFocused] = useState(false);
	const isFocused = useRef(false);

	useEffect(() => {
		if (!isFocused.current) {
			setDisplay(value !== undefined ? format(value) : "");
		}
	}, [value]);

	function handleChangeText(text: string) {
		const raw = text.replace(/\D/g, "");
		setDisplay(raw);
		onChange(raw === "" ? undefined : Number(raw));
	}

	function handleFocus() {
		isFocused.current = true;
		setFocused(true);
		// Show raw digits when focused
		setDisplay(value !== undefined ? String(value) : "");
	}

	function handleBlur() {
		isFocused.current = false;
		setFocused(false);
		setDisplay(value !== undefined ? format(value) : "");
	}

	return (
		<View
			className={cn(
				"flex h-10 flex-row items-center rounded-md border border-input bg-background shadow-black/5 shadow-sm dark:bg-input/30",
				focused && "border-ring",
				className,
			)}
		>
			<TextInput
				className="flex-1 px-3 text-base text-foreground"
				style={{
					height: 40,
					textAlignVertical: "center",
					lineHeight: undefined,
				}}
				keyboardType="numeric"
				value={display}
				onChangeText={handleChangeText}
				onFocus={handleFocus}
				onBlur={handleBlur}
				placeholder={placeholder}
				placeholderTextColor="#94a3b8"
			/>
			<View className="h-full items-center justify-center border-input border-l px-3">
				<Text className="font-medium text-muted-foreground text-sm">
					{currency}
				</Text>
			</View>
		</View>
	);
}
