import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@finance-tracker/constants";
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
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { ColorPicker } from "./color-picker";
import { CurrencyInput } from "./currency-input";
import { CurrencySelect } from "./currency-select";
import { IconPicker } from "./icon-picker";
import { OptionSelect } from "./option-select";

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

			<View className="flex flex-row gap-3">
				<Controller
					control={form.control}
					name="icon"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} className="flex-1">
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
						<Field data-invalid={fieldState.invalid} className="flex-1">
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
						<OptionSelect
							value={field.value}
							onChange={field.onChange}
							options={ACCOUNT_TYPES.map((type) => ({
								value: type,
								label: ACCOUNT_TYPE_LABELS[type],
							}))}
							placeholder={t("common.selectAccountType")}
							title={t("common.type")}
						/>
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
						<CurrencySelect value={field.value} onChange={field.onChange} />
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Button
				disabled={createAccountMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{createAccountMutation.isPending && <Spinner />}
				<Text>{t("common.create")}</Text>
			</Button>
		</ModalSheet>
	);
}
