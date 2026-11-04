import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	type GoalOverviewItem,
	useGoalAccounts,
	useGoalAllocation,
	useGoalErrorMessage,
} from "@/hooks/use-goal";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { Button } from "../ui/button";
import { ModalSheet } from "../ui/modal-sheet";
import { Spinner } from "../ui/spinner";
import { Text } from "../ui/text";
import {
	GoalFormFields,
	type GoalFormValues,
	goalFormSchema,
} from "./goal-form-fields";

interface EditGoalDialogProps {
	open: boolean;
	setIsOpen: (open: boolean) => void;
	goal: GoalOverviewItem["goal"] | null;
}

export default function EditGoalDialog({
	open,
	setIsOpen,
	goal,
}: EditGoalDialogProps) {
	const { t } = useTranslation();
	const goalErrorMessage = useGoalErrorMessage();
	const { availablePercent } = useGoalAllocation(goal?.id);
	// The goal's current linked account always stays selectable
	const goalAccounts = useGoalAccounts(goal?.id).map((a) =>
		a.account.id === goal?.linkedAccountId ? { ...a, canLink: true } : a,
	);

	// Same fields as the create form; the initial fund isn't shown
	const form = useForm<GoalFormValues>({
		resolver: zodResolver(goalFormSchema),
	});

	useEffect(() => {
		if (goal) {
			form.reset({
				name: goal.name,
				icon: goal.icon,
				color: goal.color,
				targetAmount: goal.targetAmount,
				currency: goal.currency,
				targetDate: goal.targetDate,
				linkedAccountId: goal.linkedAccountId,
				allocationPercent: goal.allocationPercent,
				priority: goal.priority,
				productUrl: goal.productUrl,
				initialFund: {},
			});
		}
	}, [goal, form]);

	const updateGoalMutation = useMutation(
		trpc.goal.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.goal.pathKey(),
				});
				globalSuccessToast(t("goals.toast.updated"));
				setIsOpen(false);
			},
			onError: (error) => {
				globalErrorToast(
					goalErrorMessage(error, (message) =>
						t("goals.toast.updateFailed", { message }),
					),
				);
			},
		}),
	);

	function onSubmit({ initialFund: _, ...data }: GoalFormValues) {
		if (!goal) return;
		updateGoalMutation.mutate({ ...data, id: goal.id });
	}

	return (
		<ModalSheet
			open={open}
			onClose={() => setIsOpen(false)}
			title={t("goals.edit.title")}
		>
			<GoalFormFields
				form={form}
				accounts={goalAccounts}
				availablePercent={availablePercent}
			/>

			<Button
				disabled={updateGoalMutation.isPending}
				onPress={() => form.handleSubmit(onSubmit)()}
			>
				{updateGoalMutation.isPending && <Spinner />}
				<Text>{t("common.saveChanges")}</Text>
			</Button>
		</ModalSheet>
	);
}
