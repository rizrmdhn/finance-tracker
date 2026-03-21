import {
	CATEGORY_TYPE_LABELS,
	CATEGORY_TYPES,
} from "@finance-tracker/constants";
import {
	type CategoryUpdateInput,
	categoryUpdateSchema,
} from "@finance-tracker/schema";
import type { Category } from "@finance-tracker/types";
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
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { ColorPicker } from "../../components/color-picker";
import { IconPicker } from "../../components/icon-picker";

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
	const form = useForm<CategoryUpdateInput>({
		resolver: zodResolver(categoryUpdateSchema),
		defaultValues: {
			id: "",
			name: "",
			type: "expense",
			icon: undefined,
			color: undefined,
		},
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
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("categories.edit.title")}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
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

						<Controller
							control={form.control}
							name="name"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.name")}</FieldLabel>
									<Input placeholder={t("categories.edit.namePlaceholder")} {...field} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="type"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.type")}</FieldLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={t("common.selectCategoryType")}>
												{field.value
													? CATEGORY_TYPE_LABELS[
															field.value as (typeof CATEGORY_TYPES)[number]
														]
													: null}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{CATEGORY_TYPES.map((type) => (
												<SelectItem key={type} value={type}>
													{CATEGORY_TYPE_LABELS[type]}
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
					</FieldGroup>

					<DialogFooter showCloseButton>
						<Button type="submit" disabled={updateCategoryMutation.isPending}>
							{updateCategoryMutation.isPending && <Spinner />}
							{t("common.saveChanges")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
