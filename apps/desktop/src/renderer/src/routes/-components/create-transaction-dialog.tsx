import {
	type TransactionInput,
	transactionSchema,
} from "@finance-tracker/schema";
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
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccountCombobox } from "@/components/account-combobox";
import { CategoryCombobox } from "@/components/category-combobox";
import { CurrencyInput } from "@/components/currency-input";
import { DatePicker } from "@/components/date-picker";
import { TagsInput } from "@/components/tags-input";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { getCurrentMonthRange } from "./utils";

interface CreateTransactionDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
}

const { from: currentFrom, to: currentTo } = getCurrentMonthRange();

export default function CreateTransactionDialog({
	open,
	setIsOpen,
}: CreateTransactionDialogProps) {
	const { t } = useTranslation();
	const form = useForm<TransactionInput>({
		resolver: zodResolver(transactionSchema),
	});

	const createTransactionMutation = useMutation(
		trpc.transaction.create.mutationOptions({
			onSuccess: async (data) => {
				await queryClient.invalidateQueries(
					trpc.transaction.list.queryOptions({
						accountId: data.accountId,
						from: currentFrom,
						to: currentTo,
					}),
				);
				await queryClient.invalidateQueries(
					trpc.transaction.summary.queryOptions({
						accountId: data.accountId,
						from: currentFrom,
						to: currentTo,
					}),
				);
				globalSuccessToast(t("transactions.toast.created"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(error.message);
			},
		}),
	);

	const onSubmit = (data: TransactionInput) => {
		createTransactionMutation.mutate(data);
	};

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const watchedCategoryId = form.watch("categoryId");
	const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
	const isTransfer = selectedCategory?.type === "transfer";

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("transactions.create.title")}</DialogTitle>
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
						<Button
							type="submit"
							disabled={createTransactionMutation.isPending}
						>
							{createTransactionMutation.isPending && <Spinner />}
							{t("common.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
