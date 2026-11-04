import { goalContributionSchema } from "@finance-tracker/schema";
import type { Account } from "@finance-tracker/types";
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
import { Textarea } from "@finance-tracker/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { CurrencyInput } from "@/components/currency-input";
import { DatePicker } from "@/components/date-picker";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { AccountOption } from "./goal-form-fields";
import {
	formatAmount,
	type GoalOverviewItem,
	useGoalAccounts,
	useGoalErrorMessage,
} from "./goal-utils";

export type GoalContributionMode = "setAside" | "withdraw";

// The amount is entered as a positive number; a withdrawal is stored negative
const contributionFormSchema = goalContributionSchema.omit({ goalId: true });

type ContributionForm = z.infer<typeof contributionFormSchema>;

interface GoalContributionDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	mode: GoalContributionMode;
	item: GoalOverviewItem | null;
}

/** Sets money aside for a goal, or withdraws it, in the source account's currency. */
export default function GoalContributionDialog({
	open,
	setIsOpen,
	mode,
	item,
}: GoalContributionDialogProps) {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();
	const goalAccounts = useGoalAccounts(item?.goal.id);
	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());

	// Set aside: rule 2, no linked account can fund a goal; the max is the free balance.
	// Withdraw: only accounts this goal holds money from; the max is what it holds there.
	const options: { account: Account; max: number }[] =
		mode === "setAside"
			? goalAccounts
					.filter((a) => !a.isLinked)
					.map(({ account, freeBalance }) => ({ account, max: freeBalance }))
			: (item?.progress.contributions ?? []).flatMap(({ accountId, held }) => {
					const account = accounts.find((a) => a.id === accountId);
					return account && held > 0 ? [{ account, max: held }] : [];
				});
	const available = options.filter((o) => o.max > 0);

	const form = useForm<ContributionForm>({
		resolver: zodResolver(contributionFormSchema),
	});

	// Start fresh each time; preselect the account when there's only one to choose
	const onlyAccountId = available.length === 1 ? available[0]?.account.id : "";
	useEffect(() => {
		if (!open) return;
		form.reset({
			accountId: onlyAccountId || undefined,
			amount: undefined,
			note: "",
			date: Date.now(),
		});
	}, [open, onlyAccountId, form]);

	const accountId = form.watch("accountId");
	const selected = options.find((o) => o.account.id === accountId);
	const currency = selected?.account.currency ?? item?.goal.currency;
	const formatMax = (o: { account: Account; max: number }) =>
		formatAmount(o.max, o.account.currency);

	const contributionMutation = useMutation(
		trpc.goal.addContribution.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.goal.pathKey(),
				});
				globalSuccessToast(
					t(
						mode === "setAside"
							? "goals.toast.setAside"
							: "goals.toast.withdrawn",
					),
				);
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.contributionFailed", { message }),
					),
				);
			},
		}),
	);

	function onSubmit({ amount, note, ...data }: ContributionForm) {
		if (!item || !selected) return;

		if (amount > selected.max) {
			form.setError("amount", {
				message: t("goals.contribution.exceedsMax", {
					amount: formatMax(selected),
				}),
			});
			return;
		}

		contributionMutation.mutate({
			...data,
			goalId: item.goal.id,
			amount: mode === "setAside" ? amount : -amount,
			note: note || undefined,
		});
	}

	const isSetAside = mode === "setAside";

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t(
							isSetAside
								? "goals.contribution.setAside"
								: "goals.contribution.withdraw",
						)}
					</DialogTitle>
					<DialogDescription>
						{t(
							isSetAside
								? "goals.contribution.setAsideDescription"
								: "goals.contribution.withdrawDescription",
						)}
					</DialogDescription>
				</DialogHeader>

				{available.length === 0 ? (
					<>
						<p className="py-4 text-center text-muted-foreground text-sm">
							{t(
								isSetAside
									? "goals.contribution.noAccounts"
									: "goals.contribution.noHeldAccounts",
							)}
						</p>
						<DialogFooter showCloseButton />
					</>
				) : (
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
										<Select
											value={field.value ?? null}
											onValueChange={(id) => field.onChange(id ?? undefined)}
										>
											<SelectTrigger className="w-full">
												<SelectValue
													placeholder={t("goals.form.linkedAccountPlaceholder")}
												>
													{selected ? (
														<AccountOption account={selected.account} />
													) : null}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{options.map((option) => (
													<SelectItem
														key={option.account.id}
														value={option.account.id}
														disabled={option.max <= 0}
													>
														<AccountOption account={option.account} />
														<span className="ml-auto text-muted-foreground">
															{formatMax(option)}
														</span>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{selected && (
											<FieldDescription>
												{t(
													isSetAside
														? "goals.contribution.freeBalance"
														: "goals.contribution.maxWithdraw",
													{ amount: formatMax(selected) },
												)}
											</FieldDescription>
										)}
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

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
												currency={currency}
											/>
											<FieldDescription>
												{t("goals.contribution.amountHelp")}
											</FieldDescription>
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
											<DatePicker
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

							<Controller
								control={form.control}
								name="note"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>
											{t("common.note")}{" "}
											<span className="text-muted-foreground text-xs">
												({t("common.optional")})
											</span>
										</FieldLabel>
										<Textarea
											placeholder={t("goals.contribution.notePlaceholder")}
											{...field}
										/>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</FieldGroup>

						<DialogFooter showCloseButton>
							<Button type="submit" disabled={contributionMutation.isPending}>
								{contributionMutation.isPending && <Spinner />}
								{t(
									isSetAside
										? "goals.contribution.setAside"
										: "goals.contribution.withdraw",
								)}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
