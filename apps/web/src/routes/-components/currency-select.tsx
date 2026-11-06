import {
	SUPPORTED_CURRENCIES,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { useExchangeRateText } from "./exchange-rate-utils";

/** A currency picker showing the code, with localized names in the list. */
export function CurrencySelect({
	value,
	onChange,
	label,
	className,
}: {
	value: SupportedCurrency;
	onChange: (currency: SupportedCurrency) => void;
	label: string;
	className?: string;
}) {
	const { currencyName } = useExchangeRateText();

	return (
		<Select value={value} onValueChange={(next) => next && onChange(next)}>
			<SelectTrigger aria-label={label} className={className}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="min-w-56" alignItemWithTrigger={false}>
				{SUPPORTED_CURRENCIES.map((currency) => (
					<SelectItem key={currency} value={currency}>
						<span className="font-medium">{currency}</span>
						<span className="text-muted-foreground">
							{currencyName(currency)}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
