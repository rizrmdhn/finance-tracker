import type { SupportedCurrency } from "@finance-tracker/constants";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@finance-tracker/ui/components/input-group";
import {
	formatAmountInput,
	getAmountDecimalSeparator,
	parseAmountInput,
} from "@finance-tracker/utils";
import { useEffect, useRef, useState } from "react";

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
	const [display, setDisplay] = useState(() =>
		formatAmountInput(value, currency),
	);
	const isFocused = useRef(false);
	const decimalSeparator = getAmountDecimalSeparator(currency);

	useEffect(() => {
		if (!isFocused.current) {
			setDisplay(formatAmountInput(value, currency));
		}
	}, [value, currency]);

	function countSignificant(text: string) {
		return [...text].filter((c) => /\d/.test(c) || c === decimalSeparator)
			.length;
	}

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const input = e.target;
		let text = input.value;
		let caret = input.selectionStart ?? text.length;

		// Deleting only a group separator would be undone by regrouping, so delete the digit beside it.
		const inputType = (e.nativeEvent as InputEvent).inputType;
		if (
			inputType?.startsWith("deleteContent") &&
			parseAmountInput(text, currency).display === display
		) {
			const backward = inputType === "deleteContentBackward";
			const index = backward
				? text.slice(0, caret).search(/\d\D*$/)
				: text.slice(caret).search(/\d/);
			if (index >= 0) {
				const at = backward ? index : caret + index;
				text = text.slice(0, at) + text.slice(at + 1);
				if (backward) caret = at;
			}
		}

		const parsed = parseAmountInput(text, currency);
		setDisplay(parsed.display);
		onChange(parsed.value);

		// Keep the caret after the same digits once separators are added or removed.
		const target = countSignificant(text.slice(0, caret));
		let position = 0;
		for (let seen = 0; position < parsed.display.length && seen < target; ) {
			if (countSignificant(parsed.display[position])) seen++;
			position++;
		}
		requestAnimationFrame(() => input.setSelectionRange(position, position));
	}

	function handleBlur() {
		isFocused.current = false;
		setDisplay(formatAmountInput(value, currency));
	}

	return (
		<InputGroup className={className}>
			<InputGroupInput
				inputMode={decimalSeparator ? "decimal" : "numeric"}
				value={display}
				onChange={handleChange}
				onFocus={() => {
					isFocused.current = true;
				}}
				onBlur={handleBlur}
				placeholder={placeholder}
			/>
			<InputGroupAddon>
				<InputGroupText>{currency}</InputGroupText>
			</InputGroupAddon>
		</InputGroup>
	);
}
