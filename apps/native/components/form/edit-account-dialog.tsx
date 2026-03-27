import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@finance-tracker/constants";
import {
	type AccountUpdateInput,
	accountUpdateSchema,
} from "@finance-tracker/schema";
import type { Account } from "@finance-tracker/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
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

interface EditAccountDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	account: Account | null;
}

export default function EditAccountDialog({
	open,
	setIsOpen,
	account,
}: EditAccountDialogProps) {
	const { t } = useTranslation();

	const form = useForm<AccountUpdateInput>({
		resolver: zodResolver(accountUpdateSchema),
	});

	useEffect(() => {
		if (account) {
			form.reset({
				name: account.name,
				type: account.type,
				color: account.color ?? undefined,
				icon: account.icon ?? undefined,
				initialBalance: account.initialBalance,
				currency: account.currency,
				id: account.id,
			});
		}
	}, [account, form]);

	const updateAccountMutation = useMutation(
		trpc.account.update.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.account.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.account.listWithBalance.queryOptions(),
					),
				]);
				globalSuccessToast(t("accounts.toast.updated"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("accounts.toast.updateFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: AccountUpdateInput) {
		updateAccountMutation.mutate(data);
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("accounts.edit.title")}
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
				disabled={updateAccountMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{updateAccountMutation.isPending && <Spinner />}
				<Text>{t("common.saveChanges")}</Text>
			</Button>
		</ModalSheet>
	);
}
