import type { SupportedCurrency } from "@finance-tracker/constants";
import { goalPurchaseSchema } from "@finance-tracker/schema";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@finance-tracker/ui/components/dialog";
import {
	Field,
	FieldDescription,
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
import { PlusIcon, XIcon } from "lucide-react";
import {
	Controller,
	type DefaultValues,
	useFieldArray,
	useForm,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CategoryCombobox } from "@/components/category-combobox";
import { CurrencyInput } from "@/components/currency-input";
import { DatePicker } from "@/components/date-picker";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { AccountOption } from "./goal-form-fields";
import {
	formatAmount,
	type GoalOverviewItem,
	useGoalErrorMessage,
} from "./goal-utils";

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
	const { data: allocations, isSuccess } = useQuery(
		trpc.goal.getAccountAllocations.queryOptions(),
	);

	if (!item) return null;

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("goals.purchase.title")}</DialogTitle>
					<DialogDescription>
						{t("goals.purchase.description", { name: item.goal.name })}
					</DialogDescription>
				</DialogHeader>
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
					<Spinner className="mx-auto my-6" />
				)}
			</DialogContent>
		</Dialog>
	);
}

function getDefaultPayments(
	{ goal, progress }: GoalOverviewItem,
	linkedBalance: number,
) {
	const payments: Partial<PaymentRow>[] = [];
	if (goal.linkedAccountId && linkedBalance > 0)
		payments.push({
			accountId: goal.linkedAccountId,
			amount: linkedBalance,
			source: "linked",
		});
	for (const c of progress.contributions)
		if (c.held > 0)
			payments.push({
				accountId: c.accountId,
				amount: c.held,
				source: "setAside",
			});
	// No account yet: the user picks who pays the rest
	const shortfall = goal.targetAmount - progress.total;
	if (shortfall > 0 || payments.length === 0)
		payments.push({
			amount: shortfall > 0 ? shortfall : undefined,
			source: "shortfall",
		});
	return payments;
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
			payments: getDefaultPayments(item, linkedBalance),
			date: Date.now(),
		} satisfies DefaultValues<PurchaseForm>,
	});
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "payments",
	});

	const rateMap = new Map(rates.map((r) => [r.target, r.rate]));
	const currencyOf = (accountId?: string) =>
		accounts.find((a) => a.id === accountId)?.currency ?? goal.currency;
	const toGoalCurrency = (amount: number, currency: SupportedCurrency) => {
		if (currency === goal.currency) return amount;
		const rate = rateMap.get(currency);
		return rate ? amount / rate : amount;
	};

	const payments = form.watch("payments");
	const inGoalCurrency = (p: Partial<PaymentRow>) =>
		toGoalCurrency(p.amount ?? 0, currencyOf(p.accountId));
	const total = payments.reduce((sum, p) => sum + inGoalCurrency(p), 0);

	// The shortfall row covers whatever the other rows leave of the target
	const remainingFor = (index: number) =>
		Math.max(
			goal.targetAmount -
				payments.reduce(
					(sum, p, i) => (i === index ? sum : sum + inGoalCurrency(p)),
					0,
				),
			0,
		);

	function onAccountChange(index: number, accountId: string) {
		form.setValue(`payments.${index}.accountId`, accountId, {
			shouldValidate: form.formState.isSubmitted,
		});
		if (payments[index]?.source !== "shortfall") return;

		// Re-express the remaining amount in the chosen account's currency
		const currency = currencyOf(accountId);
		const rate = currency === goal.currency ? 1 : rateMap.get(currency);
		if (rate)
			form.setValue(
				`payments.${index}.amount`,
				Math.round(remainingFor(index) * rate * 100) / 100,
			);
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

	const format = (amount: number) => formatAmount(amount, goal.currency);
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

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col gap-4"
		>
			<FieldGroup>
				<Field>
					<FieldLabel>{t("goals.purchase.payments")}</FieldLabel>
					<div className="flex flex-col gap-3">
						{fields.map((row, index) => {
							const label = rowLabel(index);
							return (
								<div key={row.id} className="flex flex-col gap-1">
									{label && (
										<span className="text-muted-foreground text-xs">
											{label}
										</span>
									)}
									<div className="flex items-start gap-2">
										<Controller
											control={form.control}
											name={`payments.${index}.accountId`}
											render={({ field, fieldState }) => {
												const account = accounts.find(
													(a) => a.id === field.value,
												);
												return (
													<Field
														data-invalid={fieldState.invalid}
														className="min-w-0 flex-1"
													>
														<Select
															value={field.value ?? null}
															onValueChange={(id) =>
																id && onAccountChange(index, id)
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue
																	placeholder={t(
																		"goals.form.linkedAccountPlaceholder",
																	)}
																>
																	{account ? (
																		<AccountOption account={account} />
																	) : null}
																</SelectValue>
															</SelectTrigger>
															<SelectContent>
																{accounts.map((a) => (
																	<SelectItem key={a.id} value={a.id}>
																		<AccountOption account={a} />
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														{fieldState.invalid && (
															<FieldError errors={[fieldState.error]} />
														)}
													</Field>
												);
											}}
										/>
										<Controller
											control={form.control}
											name={`payments.${index}.amount`}
											render={({ field, fieldState }) => (
												<Field
													data-invalid={fieldState.invalid}
													className="w-40 shrink-0"
												>
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
											type="button"
											variant="ghost"
											size="icon"
											aria-label={t("goals.purchase.removePayment")}
											disabled={fields.length === 1}
											onClick={() => remove(index)}
										>
											<XIcon />
										</Button>
									</div>
								</div>
							);
						})}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() =>
							// The user fills in the account and amount
							append({ source: "other" } as PaymentRow)
						}
					>
						<PlusIcon />
						{t("goals.purchase.addPayment")}
					</Button>
					<FieldDescription>
						{t("goals.purchase.paymentsHelp")}
					</FieldDescription>
					<div className="flex justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
						<span className="font-medium">
							{t("goals.purchase.total", { amount: format(total) })}
						</span>
						<span className="text-muted-foreground">
							{t("goals.purchase.target", {
								amount: format(goal.targetAmount),
							})}
						</span>
					</div>
				</Field>

				<div className="grid grid-cols-2 gap-3">
					<Controller
						control={form.control}
						name="categoryId"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel>{t("goals.purchase.category")}</FieldLabel>
								<CategoryCombobox
									value={field.value}
									onChange={field.onChange}
									categories={expenseCategories}
									placeholder={t("goals.purchase.selectCategory")}
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
				</div>
			</FieldGroup>

			<DialogFooter showCloseButton>
				<Button type="submit" disabled={purchaseMutation.isPending}>
					{purchaseMutation.isPending && <Spinner />}
					{t("goals.purchase.confirm")}
				</Button>
			</DialogFooter>
		</form>
	);
}
