import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
import {
	type BudgetUpdateInput,
	budgetUpdateSchema,
} from "@finance-tracker/schema";
import type { BudgetWithSpent } from "@finance-tracker/types";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { Spinner } from "@finance-tracker/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CategoryCombobox } from "@/components/category-combobox";
import { CurrencyInput } from "@/components/currency-input";
import { DatePicker } from "@/components/date-picker";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

interface EditBudgetDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	budget: BudgetWithSpent | null;
	from: number;
	to: number;
}

export default function EditBudgetDialog({
	open,
	setIsOpen,
	budget,
	from,
	to,
}: EditBudgetDialogProps) {
	const { t } = useTranslation();

	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const expenseCategories = categories.filter((c) => c.type === "expense");

	const form = useForm<BudgetUpdateInput>({
		resolver: zodResolver(budgetUpdateSchema),
		defaultValues: {
			id: "",
			categoryId: "",
			amount: undefined,
			period: "monthly",
			startDate: undefined,
		},
	});

	useEffect(() => {
		if (budget) {
			form.reset({
				id: budget.id,
				categoryId: budget.categoryId,
				amount: budget.amount,
				period: budget.period as BudgetUpdateInput["period"],
				currency: budget.currency,
				startDate: budget.startDate,
			});
		}
	}, [budget, form]);

	const updateBudgetMutation = useMutation(
		trpc.budget.update.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.budget.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.budget.listWithSpent.queryOptions({ from, to }),
					),
				]);
				globalSuccessToast(t("budgets.toast.updated"));
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("budgets.toast.updateFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: BudgetUpdateInput) {
		if (!budget) return;
		updateBudgetMutation.mutate(data);
	}

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("budgets.edit.title")}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						<Controller
							control={form.control}
							name="categoryId"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.category")}</FieldLabel>
									<CategoryCombobox
										value={field.value}
										onChange={(val) => field.onChange(val ?? "")}
										categories={expenseCategories}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="amount"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.amount")}</FieldLabel>
									<CurrencyInput
										value={field.value}
										onChange={(val) => field.onChange(val)}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="currency"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.currency")}</FieldLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={t("common.selectCurrency")}>
												{field.value ? CURRENCY_LABELS[field.value as keyof typeof CURRENCY_LABELS] : null}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{SUPPORTED_CURRENCIES.map((c) => (
												<SelectItem key={c} value={c}>
													{CURRENCY_LABELS[c]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="period"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("budgets.period")}</FieldLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={t("budgets.selectPeriod")}>
												{field.value === "monthly"
													? t("budgets.monthly")
													: field.value === "weekly"
														? t("budgets.weekly")
														: null}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="monthly">
												{t("budgets.monthly")}
											</SelectItem>
											<SelectItem value="weekly">
												{t("budgets.weekly")}
											</SelectItem>
										</SelectContent>
									</Select>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="startDate"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("budgets.startDate")}</FieldLabel>
									<DatePicker value={field.value} onChange={field.onChange} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>

					<DialogFooter showCloseButton>
						<Button type="submit" disabled={updateBudgetMutation.isPending}>
							{updateBudgetMutation.isPending && <Spinner />}
							{t("common.saveChanges")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
