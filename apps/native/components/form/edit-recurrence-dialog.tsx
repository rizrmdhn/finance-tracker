import {
	RECURRENCE_FREQUENCIES,
	REUCRRENCE_FREQUENCY_LABELS,
} from "@finance-tracker/constants";
import {
	type UpdateRecurrenceInput,
	updateRecurrenceSchema,
} from "@finance-tracker/schema";
import type { RecurrenceWithTemplate } from "@finance-tracker/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { ModalSheet } from "../ui/modal-sheet";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { DatePicker } from "./date-picker";
import { OptionSelect } from "./option-select";

interface EditRecurrenceDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	recurrence: RecurrenceWithTemplate | null;
}
export default function EditRecurrenceDialog({
	open,
	setIsOpen,
	recurrence,
}: EditRecurrenceDialogProps) {
	const { t } = useTranslation();

	const form = useForm<UpdateRecurrenceInput>({
		resolver: zodResolver(updateRecurrenceSchema),
		defaultValues: {
			id: "",
			frequency: "monthly",
			endDate: undefined,
		},
	});

	useEffect(() => {
		if (recurrence) {
			form.reset({
				id: recurrence.id,
				frequency: recurrence.frequency as UpdateRecurrenceInput["frequency"],
				endDate: recurrence.endDate ?? undefined,
			});
		}
	}, [recurrence, form]);

	const updateMutation = useMutation(
		trpc.recurrence.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.recurrence.list.queryOptions(),
				);
				globalSuccessToast(t("recurrences.toast.updated"));
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("recurrences.toast.updateFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: UpdateRecurrenceInput) {
		if (!recurrence) return;
		updateMutation.mutate(data);
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("recurrences.edit.title")}
		>
			<Controller
				control={form.control}
				name="frequency"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("transactions.frequency")}</FieldLabel>
										<OptionSelect
							value={field.value}
							onChange={field.onChange}
							options={RECURRENCE_FREQUENCIES.map((f) => ({
								value: f,
								label: REUCRRENCE_FREQUENCY_LABELS[f],
							}))}
							placeholder={t("transactions.frequency")}
							title={t("transactions.frequency")}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="endDate"
				render={({ field, fieldState }) => (
					<Field>
						<View className="flex-row items-center gap-1">
							<FieldLabel invalid={fieldState.invalid}>
								{t("transactions.endDate")}
							</FieldLabel>
							<FieldDescription>({t("common.optional")})</FieldDescription>
						</View>
						<DatePicker value={field.value} onChange={field.onChange} />
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			<Button
				disabled={updateMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{updateMutation.isPending && <Spinner />}
				<Text>{t("common.saveChanges")}</Text>
			</Button>
		</ModalSheet>
	);
}
