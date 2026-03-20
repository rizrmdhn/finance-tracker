import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@finance-tracker/ui/components/input-group";
import { useEffect, useRef, useState } from "react";

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
	const [display, setDisplay] = useState(value !== undefined ? format(value) : "");
	const isFocused = useRef(false);

	useEffect(() => {
		if (!isFocused.current) {
			setDisplay(value !== undefined ? format(value) : "");
		}
	}, [value]);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const raw = e.target.value.replace(/\D/g, "");
		setDisplay(raw);
		onChange(raw === "" ? undefined : Number(raw));
	}

	function handleBlur() {
		isFocused.current = false;
		setDisplay(value !== undefined ? format(value) : "");
	}

	return (
		<InputGroup className={className}>
			<InputGroupInput
				inputMode="numeric"
				value={display}
				onChange={handleChange}
				onFocus={() => { isFocused.current = true; }}
				onBlur={handleBlur}
				placeholder={placeholder}
			/>
			<InputGroupAddon>
				<InputGroupText>{currency}</InputGroupText>
			</InputGroupAddon>
		</InputGroup>
	);
}
