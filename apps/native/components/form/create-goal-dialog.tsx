import { formatCurrency } from "@finance-tracker/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
	useGoalAccounts,
	useGoalAllocation,
	useGoalErrorMessage,
} from "@/hooks/use-goal";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { ModalSheet } from "../ui/modal-sheet";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { CurrencyInput } from "./currency-input";
import {
	AmountAccountSelect,
	GoalFormFields,
	type GoalFormValues,
	goalFormSchema,
} from "./goal-form-fields";

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

	const form = useForm<GoalFormValues>({
		resolver: zodResolver(goalFormSchema),
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

	function onSubmit({ initialFund, ...data }: GoalFormValues) {
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
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("goals.create.title")}
		>
			<GoalFormFields
				form={form}
				accounts={goalAccounts}
				availablePercent={availablePercent}
			>
				<Controller
					control={form.control}
					name="initialFund.amount"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel>{t("goals.form.initialFund")}</FieldLabel>
							<CurrencyInput
								value={field.value}
								onChange={field.onChange}
								currency={source?.account.currency ?? currency}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="initialFund.accountId"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel>{t("goals.form.initialFundAccount")}</FieldLabel>
							<AmountAccountSelect
								value={field.value}
								onChange={field.onChange}
								options={sources.map(({ account, freeBalance }) => ({
									account,
									max: freeBalance,
								}))}
								title={t("goals.form.initialFundAccount")}
							/>
							<FieldDescription>
								{source
									? t("goals.form.freeBalance", {
											amount: formatCurrency(
												source.freeBalance,
												source.account.currency,
											),
										})
									: t("goals.form.initialFundHelp")}
							</FieldDescription>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</GoalFormFields>

			<Button
				disabled={createGoalMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{createGoalMutation.isPending && <Spinner />}
				<Text>{t("common.create")}</Text>
			</Button>
		</ModalSheet>
	);
}
