import {
	CURRENCY_LABELS,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency,
} from "@finance-tracker/constants";
import { useTranslation } from "react-i18next";
import { OptionSelect } from "./option-select";

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({
	value: c,
	label: c,
	description: CURRENCY_LABELS[c],
}));

interface CurrencySelectProps {
	value?: SupportedCurrency;
	onChange: (value: SupportedCurrency) => void;
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
	const { t } = useTranslation();
	return (
		<OptionSelect
			value={value}
			onChange={onChange}
			options={CURRENCY_OPTIONS}
			placeholder={t("common.selectCurrency")}
			title={t("common.currency")}
		/>
	);
}
