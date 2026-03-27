import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@finance-tracker/constants";
import { type AccountInput, accountSchema } from "@finance-tracker/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalErrorToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { ColorPicker } from "./form/color-picker";
import { CurrencyInput } from "./form/currency-input";
import { CurrencySelect } from "./form/currency-select";
import { IconPicker } from "./form/icon-picker";
import { OptionSelect } from "./form/option-select";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { Text } from "./ui/text";

export function OnboardingScreen() {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();

	const form = useForm<AccountInput>({
		resolver: zodResolver(accountSchema),
		defaultValues: {
			name: "Default Account",
			type: "bank",
			currency: "IDR",
		},
	});

	const createAccountMutation = useMutation(
		trpc.account.create.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries(trpc.account.list.queryOptions()),
					queryClient.invalidateQueries(
						trpc.account.listWithBalance.queryOptions(),
					),
				]);
				await completeOnboardingMutation.mutateAsync({
					key: "onboarding",
					value: "completed",
				});
			},
			onError: (error) => {
				globalErrorToast(
					t("accounts.toast.createFailed", { message: error.message }),
				);
			},
		}),
	);

	const completeOnboardingMutation = useMutation(
		trpc.appSetting.set.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.appSetting.get.queryOptions({ key: "onboarding" }),
				);
			},
			onError: (error) => {
				globalErrorToast(
					t("onboarding.toast.failed", {
						message: error.message,
					}),
				);
			},
		}),
	);

	const isPending =
		createAccountMutation.isPending || completeOnboardingMutation.isPending;

	function onSubmit(data: AccountInput) {
		createAccountMutation.mutate(data);
	}

	return (
		<ScrollView
			contentContainerClassName="flex-1 items-center justify-center p-4"
			contentContainerStyle={{
				paddingTop: insets.top,
				paddingBottom: insets.bottom,
			}}
		>
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-center">{t("onboarding.title")}</CardTitle>
					<CardDescription className="text-center">
						{t("onboarding.description")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<View className="flex flex-col gap-4">
						<Controller
							control={form.control}
							name="name"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.name")}</FieldLabel>
									<Input
										placeholder={t("accounts.create.namePlaceholder")}
										onChangeText={field.onChange}
										{...field}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<View className="flex flex-row gap-3">
							<Controller
								control={form.control}
								name="icon"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid} className="flex-1">
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
									<Field data-invalid={fieldState.invalid} className="flex-1">
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
						</View>

						<Controller
							control={form.control}
							name="type"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.type")}</FieldLabel>
									<OptionSelect
										value={field.value}
										onChange={field.onChange}
										options={ACCOUNT_TYPES.map((type) => ({
											value: type,
											label: ACCOUNT_TYPE_LABELS[type],
										}))}
										placeholder={t("common.selectAccountType")}
										title={t("common.type")}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="initialBalance"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>{t("common.initialBalance")}</FieldLabel>
									<CurrencyInput
										value={field.value}
										onChange={field.onChange}
										currency={form.watch("currency") || undefined}
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
									<CurrencySelect
										value={field.value}
										onChange={field.onChange}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Button
							disabled={isPending}
							onPress={form.handleSubmit(onSubmit)}
							className="w-full"
						>
							{isPending && <Spinner />}
							<Text>{t("common.create")}</Text>
						</Button>
					</View>
				</CardContent>
			</Card>
		</ScrollView>
	);
}
