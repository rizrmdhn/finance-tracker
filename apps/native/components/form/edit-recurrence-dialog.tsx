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
import type { TriggerRef } from "@rn-primitives/select";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
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
import { DatePicker } from "./date-picker";

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
	const selectTriggerRef = useRef<TriggerRef>(null);

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
				globalErrorToast(error.message);
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
						<Select
							value={
								field.value
									? {
											value: field.value,
											label: REUCRRENCE_FREQUENCY_LABELS[field.value],
										}
									: undefined
							}
							onValueChange={(option) => field.onChange(option?.value)}
						>
							<SelectTrigger
								ref={selectTriggerRef}
								className="w-full"
								onTouchStart={Platform.select({
									web: () => selectTriggerRef.current?.open(),
								})}
							>
								<SelectValue placeholder={t("common.selectCategoryType")}>
									{field.value
										? REUCRRENCE_FREQUENCY_LABELS[field.value]
										: null}
								</SelectValue>
							</SelectTrigger>
							<SelectContent portalHost="modal-select">
								{RECURRENCE_FREQUENCIES.map((frequency) => (
									<SelectItem
										key={frequency}
										value={frequency}
										label={REUCRRENCE_FREQUENCY_LABELS[frequency]}
									/>
								))}
							</SelectContent>
						</Select>
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
