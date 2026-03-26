import {
	CATEGORY_TYPE_LABELS,
	CATEGORY_TYPES,
} from "@finance-tracker/constants";
import {
	type CategoryUpdateInput,
	categoryUpdateSchema,
} from "@finance-tracker/schema";
import type { Category } from "@finance-tracker/types";
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
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
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
import { ColorPicker } from "./color-picker";
import { IconPicker } from "./icon-picker";

interface EditCategoryDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	category: Category | null;
}

export default function EditCategoryDialog({
	open,
	setIsOpen,
	category,
}: EditCategoryDialogProps) {
	const { t } = useTranslation();
	const selectTriggerRef = useRef<TriggerRef>(null);
	const form = useForm<CategoryUpdateInput>({
		resolver: zodResolver(categoryUpdateSchema),
	});

	useEffect(() => {
		if (category) {
			form.reset({
				id: category.id,
				name: category.name,
				type: category.type as CategoryUpdateInput["type"],
				icon: (category.icon ?? undefined) as CategoryUpdateInput["icon"],
				color: (category.color ?? undefined) as CategoryUpdateInput["color"],
			});
		}
	}, [category, form]);

	const updateCategoryMutation = useMutation(
		trpc.category.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.category.list.queryOptions());
				globalSuccessToast(t("categories.toast.updated"));
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("categories.toast.updateFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: CategoryUpdateInput) {
		if (!category) return;
		updateCategoryMutation.mutate(data);
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("categories.edit.title")}
		>
			<View className="flex flex-row gap-3">
				<Controller
					control={form.control}
					name="icon"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} className="flex-1">
							<FieldLabel>{t("common.icon")}</FieldLabel>
							<IconPicker value={field.value} onChange={field.onChange} />
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="color"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} className="flex-1">
							<FieldLabel>{t("common.color")}</FieldLabel>
							<ColorPicker value={field.value} onChange={field.onChange} />
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</View>

			<Controller
				control={form.control}
				name="name"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("common.name")}</FieldLabel>
						<Input
							placeholder={t("categories.create.namePlaceholder")}
							value={field.value}
							onChangeText={field.onChange}
							onBlur={field.onBlur}
							ref={field.ref}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Controller
				control={form.control}
				name="type"
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>{t("common.type")}</FieldLabel>
						<Select
							value={
								field.value
									? {
											value: field.value,
											label: CATEGORY_TYPE_LABELS[field.value],
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
										? CATEGORY_TYPE_LABELS[
												field.value as (typeof CATEGORY_TYPES)[number]
											]
										: null}
								</SelectValue>
							</SelectTrigger>
							<SelectContent portalHost="modal-select">
								{CATEGORY_TYPES.map((type) => (
									<SelectItem
										key={type}
										value={type}
										label={CATEGORY_TYPE_LABELS[type]}
									/>
								))}
							</SelectContent>
						</Select>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Button
				disabled={updateCategoryMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{updateCategoryMutation.isPending && <Spinner />}
				<Text>{t("common.saveChanges")}</Text>
			</Button>
		</ModalSheet>
	);
}
