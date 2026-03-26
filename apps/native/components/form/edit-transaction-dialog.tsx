import {
	RECURRENCE_FREQUENCIES,
	REUCRRENCE_FREQUENCY_LABELS,
} from "@finance-tracker/constants";
import {
	type UpdateTransactionInput,
	updateTransactionSchema,
} from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Label } from "../ui/label";
import { ModalSheet } from "../ui/modal-sheet";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { Textarea } from "../ui/textarea";
import { AccountCombobox } from "./account-combobox";
import { CategoryCombobox } from "./category-combobox";
import { CurrencyInput } from "./currency-input";
import { DatePicker } from "./date-picker";
import { TagsInput } from "./tags-input";

interface EditTransactionDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	transaction: Transaction | null;
}

export default function EditTransactionDialog({
	open,
	setIsOpen,
	transaction,
}: EditTransactionDialogProps) {
	const { t } = useTranslation();

	const form = useForm<UpdateTransactionInput>({
		resolver: zodResolver(updateTransactionSchema),
	});

	useEffect(() => {
		if (transaction) {
			form.reset({
				id: transaction.id,
				amount: transaction.amount,
				note: transaction.note ?? undefined,
				categoryId: transaction.categoryId ?? undefined,
				accountId: transaction.accountId,
				toAccountId: transaction.toAccountId ?? undefined,
				tags: transaction.tags
					? (JSON.parse(transaction.tags) as string[])
					: undefined,
				date: transaction.date,
			});
		}
	}, [transaction, form]);

	const updateMutation = useMutation(
		trpc.transaction.update.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.list.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.summary.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.paginated.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.infiniteList.queryKey(),
					}),
				]);
				globalSuccessToast(t("transactions.toast.updated"));
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("transactions.toast.updateFailed", { message: error.message }),
				);
			},
		}),
	);

	const onSubmit = (data: UpdateTransactionInput) => {
		updateMutation.mutate(data);
	};

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const watchedCategoryId = form.watch("categoryId");
	const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
	const isTransfer = selectedCategory?.type === "transfer";

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("transactions.edit.title")}
		>
			<Controller
				control={form.control}
				name="accountId"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel invalid={fieldState.invalid}>
							{t("common.account")}
						</FieldLabel>
						<AccountCombobox
							value={field.value}
							onChange={field.onChange}
							accounts={accounts}
						/>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="categoryId"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel invalid={fieldState.invalid}>
							{t("common.category")}
						</FieldLabel>
						<CategoryCombobox
							value={field.value}
							onChange={field.onChange}
							categories={categories}
						/>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			{isTransfer && (
				<Controller
					control={form.control}
					name="toAccountId"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel invalid={fieldState.invalid}>
								{t("common.toAccount")}
							</FieldLabel>
							<AccountCombobox
								value={field.value}
								onChange={field.onChange}
								accounts={accounts}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			)}

			<View className="flex-row gap-3">
				<Controller
					control={form.control}
					name="amount"
					render={({ field, fieldState }) => (
						<Field className="flex-1">
							<FieldLabel invalid={fieldState.invalid}>
								{t("common.amount")}
							</FieldLabel>
							<CurrencyInput value={field.value} onChange={field.onChange} />
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="tags"
					render={({ field, fieldState }) => (
						<Field className="flex-1">
							<FieldLabel invalid={fieldState.invalid}>
								{t("common.tags")}
							</FieldLabel>
							<TagsInput value={field.value} onChange={field.onChange} />
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</View>

			<Controller
				control={form.control}
				name="note"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel invalid={fieldState.invalid}>
							{t("common.note")}
						</FieldLabel>
						<Textarea
							placeholder={t("transactions.notePlaceholder")}
							value={field.value}
							onChangeText={field.onChange}
							onBlur={field.onBlur}
						/>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="date"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel invalid={fieldState.invalid}>
							{t("common.date")}
						</FieldLabel>
						<DatePicker value={field.value} onChange={field.onChange} />
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			{/* Repeat / Recurrence */}
			<View className="flex-row items-center gap-2">
				<Checkbox
					checked={!!form.watch("recurrence")}
					onCheckedChange={(checked) => {
						if (checked) {
							form.setValue("recurrence", { frequency: "monthly" });
						} else {
							form.setValue("recurrence", undefined);
						}
					}}
				/>
				<Label>{t("transactions.repeat")}</Label>
			</View>

			{form.watch("recurrence") && (
				<>
					<Controller
						control={form.control}
						name="recurrence.frequency"
						render={({ field, fieldState }) => (
							<Field>
								<FieldLabel invalid={fieldState.invalid}>
									{t("transactions.frequency")}
								</FieldLabel>
								<Select
									value={
										field.value
											? {
													value: field.value,
													label: REUCRRENCE_FREQUENCY_LABELS[field.value],
												}
											: undefined
									}
									onValueChange={(option) => field.onChange(option?.value)}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select frequency" />
									</SelectTrigger>
									<SelectContent portalHost="modal-select">
										{RECURRENCE_FREQUENCIES.map((f) => (
											<SelectItem
												key={f}
												value={f}
												label={REUCRRENCE_FREQUENCY_LABELS[f]}
											/>
										))}
									</SelectContent>
								</Select>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>

					<Controller
						control={form.control}
						name="recurrence.endDate"
						render={({ field, fieldState }) => (
							<Field>
								<View className="flex-row items-center gap-1">
									<FieldLabel invalid={fieldState.invalid}>
										{t("transactions.endDate")}
									</FieldLabel>
									<FieldDescription>({t("common.optional")})</FieldDescription>
								</View>
								<DatePicker value={field.value} onChange={field.onChange} />
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
				</>
			)}

			{/* Footer inside scroll so button is always reachable */}
			<Button
				onPress={() => form.handleSubmit(onSubmit)()}
				disabled={updateMutation.isPending}
				className="mt-2"
			>
				{updateMutation.isPending && <Spinner />}
				<Text>{t("common.saveChanges")}</Text>
			</Button>
		</ModalSheet>
	);
}
