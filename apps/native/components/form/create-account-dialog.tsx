import {
	ACCOUNT_TYPE_LABELS,
	ACCOUNT_TYPES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { type AccountInput, accountSchema } from "@finance-tracker/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { ModalSheet } from "../ui/modal-sheet";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { ColorPicker } from "./color-picker";
import { CurrencyInput } from "./currency-input";
import { IconPicker } from "./icon-picker";

interface CreateAccountDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
}

export default function CreateAccountDialog({
	open,
	setIsOpen,
}: CreateAccountDialogProps) {
	const { t } = useTranslation();

	const form = useForm<AccountInput>({
		resolver: zodResolver(accountSchema),
	});

	const createAccountMutation = useMutation(
		trpc.account.create.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.account.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.account.listWithBalance.queryOptions(),
					),
				]);
				globalSuccessToast(t("accounts.toast.created"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("accounts.toast.createFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: AccountInput) {
		createAccountMutation.mutate(data);
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("accounts.create.title")}
		>
			<Controller
				control={form.control}
				name="name"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("common.name")}</FieldLabel>
						<Input
							placeholder={t("accounts.create.namePlaceholder")}
							{...field}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<View className="grid grid-cols-2 gap-3">
				<Controller
					control={form.control}
					name="icon"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel>{t("common.icon")}</FieldLabel>
							<IconPicker value={field.value} onChange={field.onChange} />
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="color"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel>{t("common.color")}</FieldLabel>
							<ColorPicker value={field.value} onChange={field.onChange} />
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</View>

			<Controller
				control={form.control}
				name="type"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("common.type")}</FieldLabel>
						<Select
							value={
								field.value
									? {
											value: field.value,
											label: ACCOUNT_TYPE_LABELS[field.value],
										}
									: undefined
							}
							onValueChange={field.onChange}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={t("common.selectAccountType")}>
									{field.value
										? ACCOUNT_TYPE_LABELS[
												field.value as (typeof ACCOUNT_TYPES)[number]
											]
										: null}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{ACCOUNT_TYPES.map((type) => (
									<SelectItem
										key={type}
										value={type}
										label={ACCOUNT_TYPE_LABELS[type]}
									/>
								))}
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="initialBalance"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("common.initialBalance")}</FieldLabel>
						<CurrencyInput
							value={field.value}
							onChange={field.onChange}
							currency={form.watch("currency") || undefined}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="currency"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("common.currency")}</FieldLabel>
						<Select
							onValueChange={field.onChange}
							value={
								field.value
									? { value: field.value, label: field.value }
									: undefined
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={t("common.selectCurrency")} />
							</SelectTrigger>
							<SelectContent>
								{SUPPORTED_CURRENCIES.map((currency) => (
									<SelectItem
										key={currency}
										value={currency}
										label={currency}
									/>
								))}
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Button
				disabled={createAccountMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{createAccountMutation.isPending && <Spinner />}
				{t("common.create")}
			</Button>
		</ModalSheet>
	);
}
