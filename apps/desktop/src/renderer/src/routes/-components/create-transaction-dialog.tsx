import {
	type TransactionInput,
	transactionSchema,
} from "@finance-tracker/schema";
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
import { Spinner } from "@finance-tracker/ui/components/spinner";
import { Textarea } from "@finance-tracker/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { CategoryCombobox } from "@/components/category-combobox";
import { CurrencyInput } from "@/components/currency-input";
import { DatePicker } from "@/components/date-picker";
import { TagsInput } from "@/components/tags-input";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

interface CreateTransactionDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
}

export default function CreateTransactionDialog({
	open,
	setIsOpen,
}: CreateTransactionDialogProps) {
	const form = useForm<TransactionInput>({
		resolver: zodResolver(transactionSchema),
	});

	const createTransactionMutation = useMutation(
		trpc.transaction.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.transaction.list.queryOptions(),
				);
				globalSuccessToast("Transaction created successfully");
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

	const { data: categories = [] } = useQuery(trpc.category.list.queryOptions());

	return (
		<Dialog open={open} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Transaction</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FieldGroup>
						<Controller
							control={form.control}
							name="categoryId"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Category</FieldLabel>
									<CategoryCombobox
										value={field.value}
										onChange={field.onChange}
										categories={categories}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<div className="grid grid-cols-2 gap-3">
							<Controller
								control={form.control}
								name="amount"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Amount</FieldLabel>
										<CurrencyInput
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
								name="tags"
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Tags</FieldLabel>
										<TagsInput value={field.value} onChange={field.onChange} />
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<Controller
							control={form.control}
							name="note"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Note</FieldLabel>
									<Textarea placeholder="e.g. Groceries" {...field} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							control={form.control}
							name="date"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel>Date</FieldLabel>
									<DatePicker value={field.value} onChange={field.onChange} />
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>

					<DialogFooter showCloseButton>
						<Button
							type="submit"
							disabled={createTransactionMutation.isPending}
						>
							{createTransactionMutation.isPending && <Spinner />}
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
