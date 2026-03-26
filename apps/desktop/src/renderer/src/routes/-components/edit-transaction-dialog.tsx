import {
	type UpdateTransactionInput,
	updateTransactionSchema,
} from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@finance-tracker/ui/components/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@finance-tracker/ui/components/field";
import { Spinner } from "@finance-tracker/ui/components/spinner";
import { Textarea } from "@finance-tracker/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccountCombobox } from "@/components/account-combobox";
import { CategoryCombobox } from "@/components/category-combobox";
import { CurrencyInput } from "@/components/currency-input";
import { DatePicker } from "@/components/date-picker";
import { TagsInput } from "@/components/tags-input";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

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
		defaultValues: { id: "" },
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

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const watchedCategoryId = form.watch("categoryId");
	const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
	const isTransfer = selectedCategory?.type === "transfer";

	function onSubmit(data: UpdateTransactionInput) {
		updateMutation.mutate(data);
	}

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("transactions.edit.title")}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						<Controller
							control={form.control}
							name="accountId"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.account")}</FieldLabel>
									<AccountCombobox
										value={field.value}
										onChange={field.onChange}
										accounts={accounts}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="categoryId"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.category")}</FieldLabel>
									<CategoryCombobox
										value={field.value}
										onChange={field.onChange}
										categories={categories}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						{isTransfer && (
							<Controller
								control={form.control}
								name="toAccountId"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("common.toAccount")}</FieldLabel>
										<AccountCombobox
											value={field.value}
											onChange={field.onChange}
											accounts={accounts}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						)}

						<div className="grid grid-cols-2 gap-3">
							<Controller
								control={form.control}
								name="amount"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("common.amount")}</FieldLabel>
										<CurrencyInput
											value={field.value}
											onChange={field.onChange}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								control={form.control}
								name="tags"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("common.tags")}</FieldLabel>
										<TagsInput value={field.value} onChange={field.onChange} />
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<Controller
							control={form.control}
							name="note"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.note")}</FieldLabel>
									<Textarea
										placeholder={t("transactions.notePlaceholder")}
										{...field}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="date"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.date")}</FieldLabel>
									<DatePicker value={field.value} onChange={field.onChange} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>

					<DialogFooter showCloseButton>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && <Spinner />}
							{t("common.saveChanges")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
