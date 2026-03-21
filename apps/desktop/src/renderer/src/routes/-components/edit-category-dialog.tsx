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
				globalSuccessToast("Category updated successfully");
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(`Failed to update category: ${error.message}`);
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
					<DialogTitle>Edit Category</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						{/* Icon + Color — side by side */}
						<div className="grid grid-cols-2 gap-3">
							<Controller
								control={form.control}
								name="icon"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Icon</FieldLabel>
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
										<FieldLabel>Color</FieldLabel>
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

						{/* Name */}
						<Controller
							control={form.control}
							name="name"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Name</FieldLabel>
									<Input placeholder="e.g. Groceries" {...field} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						{/* Type */}
						<Controller
							control={form.control}
							name="type"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Type</FieldLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select category type">
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
							Save Changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
