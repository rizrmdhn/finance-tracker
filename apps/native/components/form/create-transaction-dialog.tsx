import {
	RECURRENCE_FREQUENCIES,
	REUCRRENCE_FREQUENCY_LABELS,
} from "@finance-tracker/constants";
import {
	type TransactionInput,
	transactionSchema,
} from "@finance-tracker/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import { Textarea } from "../ui/textarea";
import { AccountCombobox } from "./account-combobox";
import { CategoryCombobox } from "./category-combobox";
import { CurrencyInput } from "./currency-input";
import { DatePicker } from "./date-picker";
import { TagsInput } from "./tags-input";

interface CreateTransactionDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
}

export default function CreateTransactionDialog({
	open,
	setIsOpen,
}: CreateTransactionDialogProps) {
	const { t } = useTranslation();

	const form = useForm<TransactionInput>({
		resolver: zodResolver(transactionSchema),
	});

	const createTransactionMutation = useMutation(
		trpc.transaction.create.mutationOptions({
			onSuccess: async (_, variables) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.list.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.summary.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.paginated.queryKey(),
					}),
					...(variables.recurrence
						? [
								queryClient.invalidateQueries({
									queryKey: trpc.recurrence.list.queryKey(),
								}),
							]
						: []),
				]);
				globalSuccessToast(t("transactions.toast.created"));
				form.reset();
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(error.message);
			},
		}),
	);

	const onSubmit = (data: TransactionInput) => {
		createTransactionMutation.mutate(data);
	};

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());
	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	const watchedCategoryId = form.watch("categoryId");
	const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
	const isTransfer = selectedCategory?.type === "transfer";

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("transactions.create.title")}</DialogTitle>
				</DialogHeader>

				<ScrollView
					className="flex-1"
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<View className="gap-4">
						<Controller
							control={form.control}
							name="accountId"
							render={({ field, fieldState }) => (
								<View className="gap-1.5">
									<Label>{t("common.account")}</Label>
									<AccountCombobox
										value={field.value}
										onChange={field.onChange}
										accounts={accounts}
									/>
									{fieldState.invalid && (
										<Text className="text-destructive text-sm">
											{fieldState.error?.message}
										</Text>
									)}
								</View>
							)}
						/>

						<Controller
							control={form.control}
							name="categoryId"
							render={({ field, fieldState }) => (
								<View className="gap-1.5">
									<Label>{t("common.category")}</Label>
									<CategoryCombobox
										value={field.value}
										onChange={field.onChange}
										categories={categories}
									/>
									{fieldState.invalid && (
										<Text className="text-destructive text-sm">
											{fieldState.error?.message}
										</Text>
									)}
								</View>
							)}
						/>

						{isTransfer && (
							<Controller
								control={form.control}
								name="toAccountId"
								render={({ field, fieldState }) => (
									<View className="gap-1.5">
										<Label>{t("common.toAccount")}</Label>
										<AccountCombobox
											value={field.value}
											onChange={field.onChange}
											accounts={accounts}
										/>
										{fieldState.invalid && (
											<Text className="text-destructive text-sm">
												{fieldState.error?.message}
											</Text>
										)}
									</View>
								)}
							/>
						)}

						<View className="flex-row gap-3">
							<Controller
								control={form.control}
								name="amount"
								render={({ field, fieldState }) => (
									<View className="flex-1 gap-1.5">
										<Label>{t("common.amount")}</Label>
										<CurrencyInput
											value={field.value}
											onChange={field.onChange}
										/>
										{fieldState.invalid && (
											<Text className="text-destructive text-sm">
												{fieldState.error?.message}
											</Text>
										)}
									</View>
								)}
							/>

							<Controller
								control={form.control}
								name="tags"
								render={({ field, fieldState }) => (
									<View className="flex-1 gap-1.5">
										<Label>{t("common.tags")}</Label>
										<TagsInput value={field.value} onChange={field.onChange} />
										{fieldState.invalid && (
											<Text className="text-destructive text-sm">
												{fieldState.error?.message}
											</Text>
										)}
									</View>
								)}
							/>
						</View>

						<Controller
							control={form.control}
							name="note"
							render={({ field, fieldState }) => (
								<View className="gap-1.5">
									<Label>{t("common.note")}</Label>
									<Textarea
										placeholder={t("transactions.notePlaceholder")}
										value={field.value}
										onChangeText={field.onChange}
										onBlur={field.onBlur}
									/>
									{fieldState.invalid && (
										<Text className="text-destructive text-sm">
											{fieldState.error?.message}
										</Text>
									)}
								</View>
							)}
						/>

						<Controller
							control={form.control}
							name="date"
							render={({ field, fieldState }) => (
								<View className="gap-1.5">
									<Label>{t("common.date")}</Label>
									<DatePicker value={field.value} onChange={field.onChange} />
									{fieldState.invalid && (
										<Text className="text-destructive text-sm">
											{fieldState.error?.message}
										</Text>
									)}
								</View>
							)}
						/>

						{/* Repeat / Recurrence */}
						<View className="flex-row items-center gap-2">
							<Checkbox
								checked={!!form.watch("recurrence")}
								onCheckedChange={(checked) => {
									if (checked) {
										form.setValue("recurrence", { frequency: "monthly" });
									} else {
										form.setValue("recurrence", undefined);
									}
								}}
							/>
							<Label>{t("transactions.repeat")}</Label>
						</View>

						{form.watch("recurrence") && (
							<>
								<Controller
									control={form.control}
									name="recurrence.frequency"
									render={({ field, fieldState }) => (
										<View className="gap-1.5">
											<Label>{t("transactions.frequency")}</Label>
											<Select
												value={
													field.value
														? {
																value: field.value,
																label: REUCRRENCE_FREQUENCY_LABELS[field.value],
															}
														: undefined
												}
												onValueChange={(option) =>
													field.onChange(option?.value)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select frequency" />
												</SelectTrigger>
												<SelectContent>
													{RECURRENCE_FREQUENCIES.map((f) => (
														<SelectItem
															key={f}
															value={f}
															label={REUCRRENCE_FREQUENCY_LABELS[f]}
														/>
													))}
												</SelectContent>
											</Select>
											{fieldState.invalid && (
												<Text className="text-destructive text-sm">
													{fieldState.error?.message}
												</Text>
											)}
										</View>
									)}
								/>

								<Controller
									control={form.control}
									name="recurrence.endDate"
									render={({ field, fieldState }) => (
										<View className="gap-1.5">
											<View className="flex-row items-center gap-1">
												<Label>{t("transactions.endDate")}</Label>
												<Text className="text-muted-foreground text-xs">
													({t("common.optional")})
												</Text>
											</View>
											<DatePicker
												value={field.value}
												onChange={field.onChange}
											/>
											{fieldState.invalid && (
												<Text className="text-destructive text-sm">
													{fieldState.error?.message}
												</Text>
											)}
										</View>
									)}
								/>
							</>
						)}
					</View>
				</ScrollView>

				<DialogFooter>
					<Button
						onPress={() => form.handleSubmit(onSubmit)()}
						disabled={createTransactionMutation.isPending}
					>
						{createTransactionMutation.isPending && <Spinner />}
						<Text>{t("common.create")}</Text>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
