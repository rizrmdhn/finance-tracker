import {
	ACCOUNT_TYPE_LABELS,
	ACCOUNT_TYPES,
	SUPPORTED_CURRENCIES,
} from "@finance-tracker/constants";
import { type AccountInput, accountSchema } from "@finance-tracker/schema";
import { Button } from "@finance-tracker/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@finance-tracker/ui/components/card";
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
import { ColorPicker } from "@/components/color-picker";
import { CurrencyInput } from "@/components/currency-input";
import { IconPicker } from "@/components/icon-picker";
import { globalErrorToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

export function OnboardingScreen() {
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
				globalErrorToast(`Failed to create account: ${error.message}`);
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
				globalErrorToast(`Failed to complete onboarding: ${error.message}`);
			},
		}),
	);

	const isPending =
		createAccountMutation.isPending || completeOnboardingMutation.isPending;

	function onSubmit(data: AccountInput) {
		createAccountMutation.mutate(data);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">Welcome to Finance Tracker</CardTitle>
					<CardDescription>
						Create your first account to start tracking your finances.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col gap-4"
					>
						<FieldGroup>
							<Controller
								control={form.control}
								name="name"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Account Name</FieldLabel>
										<Input placeholder="e.g. Main Wallet" {...field} />
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<div className="grid grid-cols-2 gap-3">
								<Controller
									control={form.control}
									name="icon"
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel>Icon</FieldLabel>
											<IconPicker
												value={field.value}
												onChange={field.onChange}
											/>
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

							<Controller
								control={form.control}
								name="type"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Account Type</FieldLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select account type">
													{field.value ? ACCOUNT_TYPE_LABELS[field.value as (typeof ACCOUNT_TYPES)[number]] : null}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{ACCOUNT_TYPES.map((type) => (
													<SelectItem key={type} value={type}>
														{ACCOUNT_TYPE_LABELS[type]}
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
								name="currency"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Currency</FieldLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Select currency" />
											</SelectTrigger>
											<SelectContent>
												{SUPPORTED_CURRENCIES.map((currency) => (
													<SelectItem key={currency} value={currency}>
														{currency}
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
								name="initialBalance"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Initial Balance</FieldLabel>
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
						</FieldGroup>

						<Button type="submit" disabled={isPending} className="w-full">
							{isPending && <Spinner />}
							Create Account & Get Started
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
