import {
	CURRENCY_LOCALE_MAP,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@finance-tracker/ui/components/input-group";
import { useEffect, useRef, useState } from "react";

const NO_DECIMAL_CURRENCIES: SupportedCurrency[] = ["IDR", "JPY"];

function format(n: number, currency: SupportedCurrency): string {
	const locale = CURRENCY_LOCALE_MAP[currency] ?? "en-US";
	const decimals = NO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;
	return new Intl.NumberFormat(locale, {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
	}).format(n);
}

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
	const [display, setDisplay] = useState(
		value !== undefined ? format(value, currency) : "",
	);
	const isFocused = useRef(false);

	useEffect(() => {
		if (!isFocused.current) {
			setDisplay(value !== undefined ? format(value, currency) : "");
		}
	}, [value, currency]);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const decimals = NO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;
		const raw =
			decimals > 0
				? e.target.value.replace(/[^\d.]/g, "")
				: e.target.value.replace(/\D/g, "");
		setDisplay(raw);
		onChange(raw === "" ? undefined : Number(raw));
	}

	function handleBlur() {
		isFocused.current = false;
		setDisplay(value !== undefined ? format(value, currency) : "");
	}

	return (
		<InputGroup className={className}>
			<InputGroupInput
				inputMode="numeric"
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
