import {
	CATEGORY_TYPE_LABELS,
	CATEGORY_TYPES,
} from "@finance-tracker/constants";
import { type CategoryInput, categorySchema } from "@finance-tracker/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { ModalSheet } from "../ui/modal-sheet";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { ColorPicker } from "./color-picker";
import { IconPicker } from "./icon-picker";
import { OptionSelect } from "./option-select";

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
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("categories.create.title")}
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
										<OptionSelect
							value={field.value}
							onChange={field.onChange}
							options={CATEGORY_TYPES.map((type) => ({
								value: type,
								label: CATEGORY_TYPE_LABELS[type],
							}))}
							placeholder={t("common.selectCategoryType")}
							title={t("common.type")}
						/>
						{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				)}
			/>

			<Button
				disabled={createCategoryMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{createCategoryMutation.isPending && <Spinner />}
				<Text>{t("common.create")}</Text>
			</Button>
		</ModalSheet>
	);
}
