import {
	CURRENCY_LABELS,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import {
	type GoalUpdateInput,
	goalUpdateSchema,
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
import { ColorPicker } from "@/components/color-picker";
import { CurrencyInput } from "@/components/currency-input";
import { IconPicker } from "@/components/icon-picker";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { LinkedAccountSelect, TargetDatePicker } from "./goal-form-fields";
import {
	type GoalOverviewItem,
	useGoalAccounts,
	useGoalAllocation,
	useGoalErrorMessage,
} from "./goal-utils";

interface EditGoalDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	goal: GoalOverviewItem["goal"] | null;
}

export default function EditGoalDialog({
	open,
	setIsOpen,
	goal,
}: EditGoalDialogProps) {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();
	const { availablePercent } = useGoalAllocation(goal?.id);
	// The goal's current linked account always stays selectable
	const goalAccounts = useGoalAccounts(goal?.id).map((a) =>
		a.account.id === goal?.linkedAccountId ? { ...a, canLink: true } : a,
	);

	const form = useForm<GoalUpdateInput>({
		resolver: zodResolver(goalUpdateSchema),
		defaultValues: { id: "" },
	});

	useEffect(() => {
		if (goal) {
			form.reset({
				id: goal.id,
				name: goal.name,
				icon: goal.icon,
				color: goal.color,
				targetAmount: goal.targetAmount,
				currency: goal.currency,
				targetDate: goal.targetDate,
				linkedAccountId: goal.linkedAccountId,
				allocationPercent: goal.allocationPercent,
				priority: goal.priority,
				productUrl: goal.productUrl,
			});
		}
	}, [goal, form]);

	const currency = form.watch("currency");

	const updateGoalMutation = useMutation(
		trpc.goal.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.goal.pathKey(),
				});
				globalSuccessToast(t("goals.toast.updated"));
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.updateFailed", { message }),
					),
				);
			},
		}),
	);

	function onSubmit(data: GoalUpdateInput) {
		if (!goal) return;
		updateGoalMutation.mutate(data);
	}

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("goals.edit.title")}</DialogTitle>
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
										onChange={field.onChange}
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
						<Button type="submit" disabled={updateGoalMutation.isPending}>
							{updateGoalMutation.isPending && <Spinner />}
							{t("common.saveChanges")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
