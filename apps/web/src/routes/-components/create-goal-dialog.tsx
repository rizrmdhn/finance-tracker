import {
	CURRENCY_LABELS,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { goalSchema } from "@finance-tracker/schema";
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
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@finance-tracker/ui/components/field";
import { Input } from "@finance-tracker/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@finance-tracker/ui/components/select";
import { Spinner } from "@finance-tracker/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { ColorPicker } from "@/components/color-picker";
import { CurrencyInput } from "@/components/currency-input";
import { IconPicker } from "@/components/icon-picker";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import {
	AccountOption,
	LinkedAccountSelect,
	TargetDatePicker,
} from "./goal-form-fields";
import {
	formatAmount,
	useGoalAccounts,
	useGoalAllocation,
	useGoalErrorMessage,
} from "./goal-utils";

// The initial fund is optional, so both its fields may stay empty
const createGoalFormSchema = goalSchema.extend({
	initialFund: goalSchema.shape.initialFund.unwrap().partial(),
});

type CreateGoalForm = z.infer<typeof createGoalFormSchema>;

interface CreateGoalDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
}

export default function CreateGoalDialog({
	open,
	setIsOpen,
}: CreateGoalDialogProps) {
	const { t } = useTranslation();
	const { displayCurrency } = useFormatCurrency();
	const goalErrorMessage = useGoalErrorMessage();
	const goalAccounts = useGoalAccounts();
	const { availablePercent, nextPriority } = useGoalAllocation();

	const form = useForm<CreateGoalForm>({
		resolver: zodResolver(createGoalFormSchema),
		defaultValues: {
			name: "",
			icon: "Gift",
			color: "#ef4444",
			targetAmount: undefined,
			currency: displayCurrency,
			targetDate: null,
			linkedAccountId: null,
			allocationPercent: availablePercent,
			priority: nextPriority,
			productUrl: null,
			initialFund: {},
		},
	});

	// Settings and other goals may load after the form is created
	useEffect(() => {
		if (!open) return;
		if (!form.getFieldState("currency").isDirty)
			form.setValue("currency", displayCurrency);
		if (!form.getFieldState("allocationPercent").isDirty)
			form.setValue("allocationPercent", availablePercent);
		if (!form.getFieldState("priority").isDirty)
			form.setValue("priority", nextPriority);
	}, [open, displayCurrency, availablePercent, nextPriority, form]);

	const currency = form.watch("currency");
	const linkedAccountId = form.watch("linkedAccountId");
	const fundAccountId = form.watch("initialFund.accountId");

	// Rule 2: no linked account (this goal's own included) can fund a goal
	const sources = goalAccounts.filter(
		(a) => !a.isLinked && a.account.id !== linkedAccountId,
	);
	const source = sources.find((a) => a.account.id === fundAccountId);

	const createGoalMutation = useMutation(
		trpc.goal.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.goal.pathKey(),
				});
				globalSuccessToast(t("goals.toast.created"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.createFailed", { message }),
					),
				);
			},
		}),
	);

	function onSubmit({ initialFund, ...data }: CreateGoalForm) {
		const { amount } = initialFund;

		if (amount !== undefined && !source) {
			form.setError("initialFund.accountId", {
				message: t("goals.form.initialFundAccountRequired"),
			});
			return;
		}
		if (amount !== undefined && source && amount > source.freeBalance) {
			form.setError("initialFund.amount", {
				message: t("goals.errors.insufficientFreeBalance"),
			});
			return;
		}

		createGoalMutation.mutate({
			...data,
			initialFund:
				amount !== undefined && source
					? { amount, accountId: source.account.id }
					: undefined,
		});
	}

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("goals.create.title")}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						<Controller
							control={form.control}
							name="name"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.name")}</FieldLabel>
									<Input
										placeholder={t("goals.form.namePlaceholder")}
										{...field}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<div className="grid grid-cols-2 gap-3">
							<Controller
								control={form.control}
								name="icon"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("common.icon")}</FieldLabel>
										<IconPicker value={field.value} onChange={field.onChange} />
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								control={form.control}
								name="color"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("common.color")}</FieldLabel>
										<ColorPicker
											value={field.value}
											onChange={field.onChange}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Controller
								control={form.control}
								name="targetAmount"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("goals.form.targetAmount")}</FieldLabel>
										<CurrencyInput
											value={field.value}
											onChange={field.onChange}
											currency={currency}
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
													{field.value ? CURRENCY_LABELS[field.value] : null}
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
						</div>

						<Controller
							control={form.control}
							name="targetDate"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("goals.form.targetDate")}</FieldLabel>
									<TargetDatePicker
										value={field.value}
										onChange={field.onChange}
									/>
									<FieldDescription>
										{t("goals.form.targetDateHelp")}
									</FieldDescription>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="linkedAccountId"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("goals.form.linkedAccount")}</FieldLabel>
									<LinkedAccountSelect
										value={field.value}
										onChange={(accountId) => {
											field.onChange(accountId);
											if (accountId && accountId === fundAccountId)
												form.setValue("initialFund.accountId", undefined);
										}}
										accounts={goalAccounts}
									/>
									<FieldDescription>
										{t("goals.form.linkedAccountHelp")}
									</FieldDescription>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<div className="flex flex-col gap-2">
							<div className="grid grid-cols-2 gap-3">
								<Controller
									control={form.control}
									name="initialFund.amount"
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>{t("goals.form.initialFund")}</FieldLabel>
											<CurrencyInput
												value={field.value}
												onChange={field.onChange}
												currency={source?.account.currency ?? currency}
											/>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									)}
								/>

								<Controller
									control={form.control}
									name="initialFund.accountId"
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>
												{t("goals.form.initialFundAccount")}
											</FieldLabel>
											<Select
												value={field.value ?? null}
												onValueChange={(id) => field.onChange(id ?? undefined)}
											>
												<SelectTrigger className="w-full">
													<SelectValue
														placeholder={t(
															"goals.form.linkedAccountPlaceholder",
														)}
													>
														{source ? (
															<AccountOption account={source.account} />
														) : null}
													</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{sources.map(({ account, freeBalance }) => (
														<SelectItem
															key={account.id}
															value={account.id}
															disabled={freeBalance <= 0}
														>
															<AccountOption account={account} />
															<span className="ml-auto text-muted-foreground">
																{formatAmount(freeBalance, account.currency)}
															</span>
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
							</div>
							<FieldDescription>
								{source
									? t("goals.form.freeBalance", {
											amount: formatAmount(
												source.freeBalance,
												source.account.currency,
											),
										})
									: t("goals.form.initialFundHelp")}
							</FieldDescription>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Controller
								control={form.control}
								name="allocationPercent"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("goals.form.allocationPercent")}</FieldLabel>
										<Input
											type="number"
											inputMode="decimal"
											min={0}
											max={100}
											value={field.value ?? ""}
											onChange={(e) =>
												field.onChange(
													e.target.value === ""
														? undefined
														: Number(e.target.value),
												)
											}
											onBlur={field.onBlur}
										/>
										<FieldDescription>
											{t("goals.form.allocationAvailable", {
												percent: availablePercent,
											})}
										</FieldDescription>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								control={form.control}
								name="priority"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>{t("goals.form.priority")}</FieldLabel>
										<Input
											type="number"
											inputMode="numeric"
											min={0}
											step={1}
											value={field.value ?? ""}
											onChange={(e) =>
												field.onChange(
													e.target.value === ""
														? undefined
														: Number(e.target.value),
												)
											}
											onBlur={field.onBlur}
										/>
										<FieldDescription>
											{t("goals.form.priorityHelp")}
										</FieldDescription>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<Controller
							control={form.control}
							name="productUrl"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("goals.form.productUrl")}</FieldLabel>
									<Input
										type="url"
										placeholder={t("goals.form.productUrlPlaceholder")}
										value={field.value ?? ""}
										onChange={(e) => field.onChange(e.target.value || null)}
										onBlur={field.onBlur}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>

					<DialogFooter showCloseButton>
						<Button type="submit" disabled={createGoalMutation.isPending}>
							{createGoalMutation.isPending && <Spinner />}
							{t("common.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
