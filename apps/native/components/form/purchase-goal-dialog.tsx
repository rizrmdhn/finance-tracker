import { goalPurchaseSchema } from "@finance-tracker/schema";
import {
	createCurrencyConverter,
	formatCurrency,
	getDefaultGoalPayments,
	getGoalPaymentRemaining,
} from "@finance-tracker/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "lucide-react-native";
import {
	Controller,
	type DefaultValues,
	useFieldArray,
	useForm,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { z } from "zod";
import { type GoalOverviewItem, useGoalErrorMessage } from "@/hooks/use-goal";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Icon } from "../ui/icon";
import { ModalSheet } from "../ui/modal-sheet";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { CategoryCombobox } from "./category-combobox";
import { CurrencyInput } from "./currency-input";
import { DatePicker } from "./date-picker";
import { OptionSelect } from "./option-select";

// `source` only labels the pre-filled rows; it isn't sent
const purchaseFormSchema = goalPurchaseSchema.omit({ goalId: true }).extend({
	payments: z
		.array(
			goalPurchaseSchema.shape.payments.element.extend({
				source: z.enum(["linked", "setAside", "shortfall", "other"]),
			}),
		)
		.min(1),
});

type PurchaseForm = z.infer<typeof purchaseFormSchema>;
type PaymentRow = PurchaseForm["payments"][number];

interface PurchaseGoalDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	item: GoalOverviewItem | null;
}

/**
 * Buys a goal: pre-fills one payment per account that holds its money (linked account balance,
 * each contribution source's held amount) plus a row for any shortfall. Each payment becomes an
 * expense in its account's currency.
 */
export default function PurchaseGoalDialog({
	open,
	setIsOpen,
	item,
}: PurchaseGoalDialogProps) {
	const { t } = useTranslation();
	const { data: allocations, isSuccess } = useQuery({
		...trpc.goal.getAccountAllocations.queryOptions(),
		enabled: open,
	});

	if (!item) return null;

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("goals.purchase.title")}
		>
			<Text className="text-muted-foreground text-sm">
				{t("goals.purchase.description", { name: item.goal.name })}
			</Text>
			{/* Mounted with each opening, so the payments are pre-filled from fresh data */}
			{isSuccess ? (
				<PurchaseGoalForm
					item={item}
					linkedBalance={
						allocations.find((a) => a.accountId === item.goal.linkedAccountId)
							?.balance ?? 0
					}
					onPurchased={() => setIsOpen(false)}
				/>
			) : (
				<View className="items-center py-6">
					<Spinner />
				</View>
			)}
		</ModalSheet>
	);
}

interface PurchaseGoalFormProps {
	item: GoalOverviewItem;
	/** The linked account's balance in its own currency. */
	linkedBalance: number;
	onPurchased: () => void;
}

function PurchaseGoalForm({
	item,
	linkedBalance,
	onPurchased,
}: PurchaseGoalFormProps) {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();
	const { goal } = item;

	const { data: allAccounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());
	// 1 goal currency = rate × target currency
	const { data: rates = [] } = useQuery(
		trpc.exchangeRate.getAll.queryOptions({ base: goal.currency }),
	);

	const accounts = allAccounts.filter((a) => !a.deletedAt);
	const expenseCategories = categories.filter((c) => c.type === "expense");

	const form = useForm<PurchaseForm>({
		resolver: zodResolver(purchaseFormSchema),
		defaultValues: {
			payments: getDefaultGoalPayments(goal, item.progress, linkedBalance),
			date: Date.now(),
		} satisfies DefaultValues<PurchaseForm>,
	});
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "payments",
	});

	const converter = createCurrencyConverter(goal.currency, rates);
	const currencyOf = (accountId?: string) =>
		accounts.find((a) => a.id === accountId)?.currency ?? goal.currency;

	const payments = form.watch("payments");
	const inGoalCurrency = payments.map((p) =>
		converter.toBase(p.amount ?? 0, currencyOf(p.accountId)),
	);
	const total = inGoalCurrency.reduce((sum, amount) => sum + amount, 0);

	// The shortfall row covers whatever the other rows leave of the target
	const remainingFor = (index: number) =>
		getGoalPaymentRemaining(goal.targetAmount, inGoalCurrency, index);

	function onAccountChange(index: number, accountId: string) {
		form.setValue(`payments.${index}.accountId`, accountId, {
			shouldValidate: form.formState.isSubmitted,
		});
		if (payments[index]?.source !== "shortfall") return;

		// Re-express the remaining amount in the chosen account's currency
		const amount = converter.fromBase(
			remainingFor(index),
			currencyOf(accountId),
		);
		if (amount !== null) form.setValue(`payments.${index}.amount`, amount);
	}

	const purchaseMutation = useMutation(
		trpc.goal.purchase.mutationOptions({
			onSuccess: async () => {
				// A purchase records expenses, so balances, summaries and budgets change too
				await Promise.all(
					[
						trpc.goal.pathKey(),
						trpc.transaction.pathKey(),
						trpc.account.pathKey(),
						trpc.budget.pathKey(),
					].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
				);
				globalSuccessToast(t("goals.toast.purchased"));
				onPurchased();
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.purchaseFailed", { message }),
					),
				);
			},
		}),
	);

	function onSubmit({ payments, ...data }: PurchaseForm) {
		purchaseMutation.mutate({
			...data,
			goalId: goal.id,
			payments: payments.map(({ accountId, amount }) => ({
				accountId,
				amount,
			})),
		});
	}

	const format = (amount: number) => formatCurrency(amount, goal.currency);
	const rowLabel = (index: number) => {
		switch (payments[index]?.source) {
			case "linked":
				return t("goals.funding.linkedAccount");
			case "setAside":
				return t("goals.funding.setAside");
			case "shortfall":
				return t("goals.purchase.shortfall", {
					amount: format(remainingFor(index)),
				});
			default:
				return null;
		}
	};
	const accountOptions = accounts.map((a) => ({
		value: a.id,
		label: a.name,
		description: a.currency,
	}));

	return (
		<>
			<Field>
				<FieldLabel>{t("goals.purchase.payments")}</FieldLabel>
				<View className="flex flex-col gap-3">
					{fields.map((row, index) => {
						const label = rowLabel(index);
						return (
							<View
								key={row.id}
								className="flex flex-col gap-2 rounded-md border border-border p-3"
							>
								{label && (
									<Text className="text-muted-foreground text-xs">{label}</Text>
								)}
								<Controller
									control={form.control}
									name={`payments.${index}.accountId`}
									render={({ field, fieldState }) => (
										<Field>
											<OptionSelect
												value={field.value}
												onChange={(id) => onAccountChange(index, id)}
												options={accountOptions}
												placeholder={t("goals.form.linkedAccountPlaceholder")}
												title={t("common.account")}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>
								<View className="flex flex-row items-start gap-2">
									<Controller
										control={form.control}
										name={`payments.${index}.amount`}
										render={({ field, fieldState }) => (
											<Field className="flex-1">
												<CurrencyInput
													value={field.value}
													onChange={field.onChange}
													currency={currencyOf(payments[index]?.accountId)}
												/>
												{fieldState.invalid && (
													<FieldError errors={[fieldState.error]} />
												)}
											</Field>
										)}
									/>
									<Button
										variant="ghost"
										size="icon"
										accessibilityLabel={t("goals.purchase.removePayment")}
										disabled={fields.length === 1}
										onPress={() => remove(index)}
									>
										<Icon as={XIcon} className="size-4" />
									</Button>
								</View>
							</View>
						);
					})}
				</View>
				<Button
					variant="outline"
					size="sm"
					className="self-start"
					onPress={() =>
						// The user fills in the account and amount
						append({ source: "other" } as PaymentRow)
					}
				>
					<Icon as={PlusIcon} className="size-4" />
					<Text>{t("goals.purchase.addPayment")}</Text>
				</Button>
				<FieldDescription>{t("goals.purchase.paymentsHelp")}</FieldDescription>
				<View className="flex flex-row justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
					<Text className="font-medium text-xs">
						{t("goals.purchase.total", { amount: format(total) })}
					</Text>
					<Text className="text-muted-foreground text-xs">
						{t("goals.purchase.target", {
							amount: format(goal.targetAmount),
						})}
					</Text>
				</View>
			</Field>

			<Controller
				control={form.control}
				name="categoryId"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("goals.purchase.category")}</FieldLabel>
						<CategoryCombobox
							value={field.value}
							onChange={field.onChange}
							categories={expenseCategories}
							placeholder={t("goals.purchase.selectCategory")}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="date"
				render={({ field, fieldState }) => (
					<Field>
						<FieldLabel>{t("common.date")}</FieldLabel>
						<DatePicker value={field.value} onChange={field.onChange} />
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Button
				disabled={purchaseMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{purchaseMutation.isPending && <Spinner />}
				<Text>{t("goals.purchase.confirm")}</Text>
			</Button>
		</>
	);
}
