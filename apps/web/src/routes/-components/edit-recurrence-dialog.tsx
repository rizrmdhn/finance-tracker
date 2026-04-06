import {
	RECURRENCE_FREQUENCIES,
	REUCRRENCE_FREQUENCY_LABELS,
} from "@finance-tracker/constants";
import {
	type UpdateRecurrenceInput,
	updateRecurrenceSchema,
} from "@finance-tracker/schema";
import type { RecurrenceWithTemplate } from "@finance-tracker/types";
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
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/date-picker";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

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
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("recurrences.edit.title")}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						<Controller
							control={form.control}
							name="frequency"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("transactions.frequency")}</FieldLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{RECURRENCE_FREQUENCIES.map((f) => (
												<SelectItem key={f} value={f}>
													{REUCRRENCE_FREQUENCY_LABELS[f]}
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

						<Controller
							control={form.control}
							name="endDate"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>
										{t("transactions.endDate")}{" "}
										<span className="text-muted-foreground text-xs">
											({t("common.optional")})
										</span>
									</FieldLabel>
									<DatePicker value={field.value} onChange={field.onChange} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>

					<DialogFooter showCloseButton>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && <Spinner />}
							{t("common.saveChanges")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
