import {
	CATEGORY_TYPE_LABELS,
	CATEGORY_TYPES,
} from "@finance-tracker/constants";
import { type CategoryInput, categorySchema } from "@finance-tracker/schema";
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
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { ColorPicker } from "../../components/color-picker";
import { IconPicker } from "../../components/icon-picker";

interface CreateCategoryDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
}

export default function CreateCategoryDialog({
	open,
	setIsOpen,
}: CreateCategoryDialogProps) {
	const { t } = useTranslation();
	const form = useForm<CategoryInput>({
		resolver: zodResolver(categorySchema),
		defaultValues: {
			name: "",
			type: "expense",
			icon: undefined,
			color: undefined,
		},
	});

	const createCategoryMutation = useMutation(
		trpc.category.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(trpc.category.list.queryOptions());
				globalSuccessToast(t("categories.toast.created"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					t("categories.toast.createFailed", { message: error.message }),
				);
			},
		}),
	);

	function onSubmit(data: CategoryInput) {
		createCategoryMutation.mutate(data);
	}

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("categories.create.title")}</DialogTitle>
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
									<Input placeholder={t("categories.create.namePlaceholder")} {...field} />
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
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
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
						<Button type="submit" disabled={createCategoryMutation.isPending}>
							{createCategoryMutation.isPending && <Spinner />}
							{t("common.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
