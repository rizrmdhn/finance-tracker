import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@finance-tracker/constants";
import { type BudgetInput, budgetSchema } from "@finance-tracker/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TriggerRef } from "@rn-primitives/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { getCurrentMonthRange } from "@/lib/utils";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
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
import { CategoryCombobox } from "./category-combobox";
import { CurrencyInput } from "./currency-input";
import { DatePicker } from "./date-picker";

interface CreateBudgetDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	from: number;
	to: number;
}

export default function CreateBudgetDialog({
	open,
	setIsOpen,
	from,
	to,
}: CreateBudgetDialogProps) {
	const { t } = useTranslation();
	const { displayCurrency } = useFormatCurrency();
	const selectTriggerRef = useRef<TriggerRef>(null);

	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const expenseCategories = categories.filter((c) => c.type === "expense");

	const form = useForm<BudgetInput>({
		resolver: zodResolver(budgetSchema),
		defaultValues: {
			categoryId: "",
			amount: undefined,
			currency: displayCurrency,
			period: "monthly",
			startDate: getCurrentMonthRange().from,
		},
	});

	const createBudgetMutation = useMutation(
		trpc.budget.create.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.budget.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.budget.listWithSpent.queryOptions({ from, to }),
					),
				]);
				globalSuccessToast(t("budgets.toast.created"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("budgets.toast.createFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: BudgetInput) {
		createBudgetMutation.mutate(data);
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("budgets.create.title")}
		>
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
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
							onValueChange={(option) => field.onChange(option?.value)}
							defaultValue={
								field.value
									? { value: field.value, label: CURRENCY_LABELS[field.value as keyof typeof CURRENCY_LABELS] }
									: undefined
							}
						>
							<SelectTrigger
								ref={selectTriggerRef}
								className="w-full"
								onTouchStart={Platform.select({
									web: () => selectTriggerRef.current?.open(),
								})}
							>
								<SelectValue placeholder={t("common.selectCurrency")}>
									{field.value ? CURRENCY_LABELS[field.value as keyof typeof CURRENCY_LABELS] : null}
								</SelectValue>
							</SelectTrigger>
							<SelectContent portalHost="modal-select">
								{SUPPORTED_CURRENCIES.map((c) => (
									<SelectItem key={c} value={c} label={CURRENCY_LABELS[c]} />
								))}
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="period"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("budgets.period")}</FieldLabel>
						<Select
							onValueChange={(option) => field.onChange(option?.value)}
							defaultValue={
								field.value
									? {
											value: field.value,
											label:
												field.value === "monthly"
													? t("budgets.monthly")
													: t("budgets.weekly"),
										}
									: undefined
							}
						>
							<SelectTrigger
								ref={selectTriggerRef}
								className="w-full"
								onTouchStart={Platform.select({
									web: () => selectTriggerRef.current?.open(),
								})}
							>
								<SelectValue placeholder={t("budgets.selectPeriod")}>
									{field.value === "monthly"
										? t("budgets.monthly")
										: field.value === "weekly"
											? t("budgets.weekly")
											: null}
								</SelectValue>
							</SelectTrigger>
							<SelectContent portalHost="modal-select">
								<SelectItem value="monthly" label={t("budgets.monthly")} />
								<SelectItem value="weekly" label={t("budgets.weekly")} />
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Button
				disabled={createBudgetMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{createBudgetMutation.isPending && <Spinner />}
				<Text>{t("common.create")}</Text>
			</Button>
		</ModalSheet>
	);
}
