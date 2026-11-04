import { goalContributionSchema } from "@finance-tracker/schema";
import {
	formatCurrency,
	type GoalContributionMode,
	getGoalContributionOptions,
} from "@finance-tracker/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import {
	type GoalOverviewItem,
	useGoalAccounts,
	useGoalErrorMessage,
} from "@/hooks/use-goal";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { ModalSheet } from "../ui/modal-sheet";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { Textarea } from "../ui/textarea";
import { CurrencyInput } from "./currency-input";
import { DatePicker } from "./date-picker";
import { AmountAccountSelect } from "./goal-form-fields";

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

	const options = getGoalContributionOptions(mode, {
		accountOptions: goalAccounts,
		accounts,
		contributions: item?.progress.contributions ?? [],
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
	const isSetAside = mode === "setAside";
	const title = t(
		isSetAside ? "goals.contribution.setAside" : "goals.contribution.withdraw",
	);

	const contributionMutation = useMutation(
		trpc.goal.addContribution.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.goal.pathKey(),
				});
				globalSuccessToast(
					t(isSetAside ? "goals.toast.setAside" : "goals.toast.withdrawn"),
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
					amount: formatCurrency(selected.max, selected.account.currency),
				}),
			});
			return;
		}

		contributionMutation.mutate({
			...data,
			goalId: item.goal.id,
			amount: isSetAside ? amount : -amount,
			note: note || undefined,
		});
	}

	return (
		<ModalSheet open={open} onClose={() => setIsOpen(false)} title={title}>
			<Text className="text-muted-foreground text-sm">
				{t(
					isSetAside
						? "goals.contribution.setAsideDescription"
						: "goals.contribution.withdrawDescription",
				)}
			</Text>

			{available.length === 0 ? (
				<Text className="py-4 text-center text-muted-foreground text-sm">
					{t(
						isSetAside
							? "goals.contribution.noAccounts"
							: "goals.contribution.noHeldAccounts",
					)}
				</Text>
			) : (
				<>
					<Controller
						control={form.control}
						name="accountId"
						render={({ field, fieldState }) => (
							<Field>
								<FieldLabel>{t("common.account")}</FieldLabel>
								<AmountAccountSelect
									value={field.value}
									onChange={field.onChange}
									options={options}
									title={t("common.account")}
								/>
								{selected && (
									<FieldDescription>
										{t(
											isSetAside
												? "goals.contribution.freeBalance"
												: "goals.contribution.maxWithdraw",
											{
												amount: formatCurrency(
													selected.max,
													selected.account.currency,
												),
											},
										)}
									</FieldDescription>
								)}
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
							<Field>
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
							<Field>
								<FieldLabel>{t("common.date")}</FieldLabel>
								<DatePicker value={field.value} onChange={field.onChange} />
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						control={form.control}
						name="note"
						render={({ field, fieldState }) => (
							<Field>
								<FieldLabel>
									{t("common.note")} ({t("common.optional")})
								</FieldLabel>
								<Textarea
									placeholder={t("goals.contribution.notePlaceholder")}
									value={field.value}
									onChangeText={field.onChange}
									onBlur={field.onBlur}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Button
						disabled={contributionMutation.isPending}
						onPress={() => form.handleSubmit(onSubmit)()}
					>
						{contributionMutation.isPending && <Spinner />}
						<Text>{title}</Text>
					</Button>
				</>
			)}
		</ModalSheet>
	);
}
