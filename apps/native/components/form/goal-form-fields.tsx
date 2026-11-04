import { goalSchema } from "@finance-tracker/schema";
import type { Account } from "@finance-tracker/types";
import { formatCurrency } from "@finance-tracker/utils";
import { XIcon } from "lucide-react-native";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import type { z } from "zod";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { ColorPicker } from "./color-picker";
import { CurrencyInput } from "./currency-input";
import { CurrencySelect } from "./currency-select";
import { DatePicker } from "./date-picker";
import { IconPicker } from "./icon-picker";
import { OptionSelect } from "./option-select";

const NO_ACCOUNT = "none";

interface LinkedAccountSelectProps {
	value?: string | null;
	onChange: (accountId: string | null) => void;
	accounts: { account: Account; canLink: boolean }[];
}

/** Linked account picker with a "no linked account" option; unavailable accounts are disabled. */
export function LinkedAccountSelect({
	value,
	onChange,
	accounts,
}: LinkedAccountSelectProps) {
	const { t } = useTranslation();

	return (
		<OptionSelect
			value={value ?? NO_ACCOUNT}
			onChange={(id) => onChange(id === NO_ACCOUNT ? null : id)}
			options={[
				{ value: NO_ACCOUNT, label: t("goals.form.noLinkedAccount") },
				...accounts.map(({ account, canLink }) => ({
					value: account.id,
					label: account.name,
					description: canLink
						? undefined
						: t("goals.form.linkedAccountUnavailable"),
					disabled: !canLink,
				})),
			]}
			title={t("goals.form.linkedAccount")}
		/>
	);
}

interface AmountAccountSelectProps {
	value?: string;
	onChange: (accountId: string) => void;
	/** `max` is the most the account can give, in its own currency. */
	options: { account: Account; max: number }[];
	title: string;
}

/** Account picker showing how much each account can give; empty accounts are disabled. */
export function AmountAccountSelect({
	value,
	onChange,
	options,
	title,
}: AmountAccountSelectProps) {
	const { t } = useTranslation();

	return (
		<OptionSelect
			value={value}
			onChange={onChange}
			options={options.map(({ account, max }) => ({
				value: account.id,
				label: account.name,
				description: formatCurrency(max, account.currency),
				disabled: max <= 0,
			}))}
			placeholder={t("goals.form.linkedAccountPlaceholder")}
			title={title}
		/>
	);
}

interface TargetDatePickerProps {
	value?: number | null;
	onChange: (date: number | null) => void;
}

/** Optional date: the picker plus a button that clears it. */
export function TargetDatePicker({ value, onChange }: TargetDatePickerProps) {
	const { t } = useTranslation();

	return (
		<View className="flex flex-row gap-2">
			<View className="flex-1">
				<DatePicker value={value ?? undefined} onChange={onChange} />
			</View>
			{value != null && (
				<Button
					variant="outline"
					size="icon"
					accessibilityLabel={t("goals.form.clearTargetDate")}
					onPress={() => onChange(null)}
				>
					<Icon as={XIcon} className="size-4" />
				</Button>
			)}
		</View>
	);
}

// The initial fund is optional, so both its fields may stay empty
export const goalFormSchema = goalSchema.extend({
	initialFund: goalSchema.shape.initialFund.unwrap().partial(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

/** Parses a number input; empty stays undefined so the schema reports it. */
const toNumber = (text: string) => (text === "" ? undefined : Number(text));

interface GoalFormFieldsProps {
	form: UseFormReturn<GoalFormValues>;
	accounts: { account: Account; canLink: boolean }[];
	/** The surplus share the other active goals leave free. */
	availablePercent: number;
	/** Rendered after the linked account (the create form's initial fund). */
	children?: React.ReactNode;
}

/** The fields create and edit share, in the web form's order. */
export function GoalFormFields({
	form,
	accounts,
	availablePercent,
	children,
}: GoalFormFieldsProps) {
	const { t } = useTranslation();
	const currency = form.watch("currency");
	const color = form.watch("color");

	return (
		<>
			<Controller
				control={form.control}
				name="name"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("common.name")}</FieldLabel>
						<Input
							placeholder={t("goals.form.namePlaceholder")}
							value={field.value}
							onChangeText={field.onChange}
							onBlur={field.onBlur}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<View className="flex flex-row gap-3">
				<Controller
					control={form.control}
					name="icon"
					render={({ field, fieldState }) => (
						<Field className="flex-1">
							<FieldLabel>{t("common.icon")}</FieldLabel>
							<IconPicker
								value={field.value}
								onChange={field.onChange}
								color={color}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="color"
					render={({ field, fieldState }) => (
						<Field className="flex-1">
							<FieldLabel>{t("common.color")}</FieldLabel>
							<ColorPicker value={field.value} onChange={field.onChange} />
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</View>

			<Controller
				control={form.control}
				name="targetAmount"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.form.targetAmount")}</FieldLabel>
						<CurrencyInput
							value={field.value}
							onChange={field.onChange}
							currency={currency}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="currency"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("common.currency")}</FieldLabel>
						<CurrencySelect value={field.value} onChange={field.onChange} />
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="targetDate"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.form.targetDate")}</FieldLabel>
						<TargetDatePicker value={field.value} onChange={field.onChange} />
						<FieldDescription>
							{t("goals.form.targetDateHelp")}
						</FieldDescription>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="linkedAccountId"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.form.linkedAccount")}</FieldLabel>
						<LinkedAccountSelect
							value={field.value}
							onChange={(accountId) => {
								field.onChange(accountId);
								// Rule 2: the linked account can't also fund the goal
								if (
									accountId &&
									accountId === form.getValues("initialFund.accountId")
								)
									form.setValue("initialFund.accountId", undefined);
							}}
							accounts={accounts}
						/>
						<FieldDescription>
							{t("goals.form.linkedAccountHelp")}
						</FieldDescription>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			{children}

			<Controller
				control={form.control}
				name="allocationPercent"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.form.allocationPercent")}</FieldLabel>
						<Input
							keyboardType="decimal-pad"
							value={field.value === undefined ? "" : String(field.value)}
							onChangeText={(text) => field.onChange(toNumber(text))}
							onBlur={field.onBlur}
						/>
						<FieldDescription>
							{t("goals.form.allocationAvailable", {
								percent: availablePercent,
							})}
						</FieldDescription>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="priority"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.form.priority")}</FieldLabel>
						<Input
							keyboardType="number-pad"
							value={field.value === undefined ? "" : String(field.value)}
							onChangeText={(text) => field.onChange(toNumber(text))}
							onBlur={field.onBlur}
						/>
						<FieldDescription>{t("goals.form.priorityHelp")}</FieldDescription>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="productUrl"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.form.productUrl")}</FieldLabel>
						<Input
							keyboardType="url"
							autoCapitalize="none"
							autoCorrect={false}
							placeholder={t("goals.form.productUrlPlaceholder")}
							value={field.value ?? ""}
							onChangeText={(text) => field.onChange(text || null)}
							onBlur={field.onBlur}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>
		</>
	);
}
