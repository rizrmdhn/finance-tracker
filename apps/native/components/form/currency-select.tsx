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
	/** The picker sheet's title; "Currency" by default. */
	title?: string;
}

export function CurrencySelect({
	value,
	onChange,
	title,
}: CurrencySelectProps) {
	const { t } = useTranslation();
	return (
		<OptionSelect
			value={value}
			onChange={onChange}
			options={CURRENCY_OPTIONS}
			placeholder={t("common.selectCurrency")}
			title={title ?? t("common.currency")}
		/>
	);
}
