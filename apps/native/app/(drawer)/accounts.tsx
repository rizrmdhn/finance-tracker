import type { AccountWithBalance } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Container } from "@/components/container";
import CreateAccountDialog from "@/components/form/create-account-dialog";
import EditAccountDialog from "@/components/form/edit-account-dialog";
import { ICON_MAP } from "@/components/form/icon-picker";
import { Button } from "@/components/ui/button";
import { Icon as IconComp } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import useModalState from "@/hooks/use-modal-state";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";

export default function Accounts() {
	const { t } = useTranslation();
	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		delete: false,
	});

	const [selected, setSelected] = useState<AccountWithBalance | null>(null);

	const { data: accounts = [], isLoading, isRefetching, refetch } = useQuery(
		trpc.account.listWithBalance.queryOptions(),
	);

	const deleteMutation = useMutation(
		trpc.account.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries(
					trpc.account.listWithBalance.queryOptions(),
				);
				globalSuccessToast(t("accounts.toast.deleted"));
				closeModal("delete");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					t("accounts.toast.deleteFailed", { message: error.message }),
				);
			},
		}),
	);

	function handleEdit(account: AccountWithBalance) {
		setSelected(account);
		openModal("edit");
	}

	function handleDelete(account: AccountWithBalance) {
		setSelected(account);
		openModal("delete");
	}

	return (
		<Container onRefresh={refetch} refreshing={isRefetching}>
			<View className="flex flex-col gap-6 px-6 py-3">
				<View className="flex flex-row items-center justify-between">
					<View>
						<Text className="font-semibold text-xl">{t("accounts.title")}</Text>
						{isLoading ? (
							<Skeleton className="mt-1 h-4 w-24" />
						) : (
							<Text className="text-muted-foreground text-sm">
								{t("accounts.accountCount", { count: accounts.length })}
							</Text>
						)}
					</View>
					<Button onPress={() => openModal("create")}>
						<Text>{t("accounts.addAccount")}</Text>
					</Button>
				</View>

				<View className="flex flex-col gap-3">
					{accounts.map((account) => {
						const Icon = account.icon ? ICON_MAP[account.icon] : null;
						return (
							<View
								key={account.id}
								className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3"
							>
								{/* Top row: icon + name/balance + actions */}
								<View className="flex flex-row items-center gap-3">
									{Icon ? (
										<IconComp
											as={Icon}
											className="size-4 shrink-0"
											color={account.color ?? "#94a3b8"}
										/>
									) : (
										<View
											className="size-3 shrink-0 rounded-full"
											style={{ backgroundColor: account.color ?? "#94a3b8" }}
										/>
									)}
									<View className="flex min-w-0 flex-1 flex-col">
										<Text className="truncate font-medium text-sm">
											{account.name}
										</Text>
										<Text className="text-muted-foreground text-xs">
											{new Intl.NumberFormat("id-ID", {
												style: "currency",
												currency: account.currency,
												maximumFractionDigits: 0,
											}).format(account.balance)}
										</Text>
									</View>
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											onPress={() => handleEdit(account)}
										>
											<IconComp as={PencilIcon} className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive"
											onPress={() => handleDelete(account)}
										>
											<IconComp
												as={Trash2Icon}
												className="size-3.5 text-destructive"
											/>
										</Button>
									</View>
								</View>

								{/* Second row: account type badge */}
								<View className="flex flex-row items-center gap-2">
									<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
										{account.type}
									</Text>
								</View>
							</View>
						);
					})}
					{isLoading &&
						[...Array(3)].map(() => (
							<View
								key={createId()}
								className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3"
							>
								<View className="flex flex-row items-center gap-3">
									<Skeleton className="size-4 shrink-0 rounded-full" />
									<View className="flex flex-1 flex-col gap-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-20" />
									</View>
									<View className="flex shrink-0 flex-row items-center gap-1">
										<Skeleton className="size-7" />
										<Skeleton className="size-7" />
									</View>
								</View>
								<View className="flex flex-row items-center gap-2">
									<Skeleton className="h-5 w-16 rounded-full" />
								</View>
							</View>
						))}
					{accounts.length === 0 && !isLoading && (
						<Text className="py-6 text-center text-muted-foreground text-sm">
							{t("accounts.noAccounts")}
						</Text>
					)}
				</View>

				<CreateAccountDialog
					open={state.create}
					setIsOpen={(open) =>
						open ? openModal("create") : closeModal("create")
					}
				/>

				<EditAccountDialog
					open={state.edit}
					setIsOpen={(open) => (open ? openModal("edit") : closeModal("edit"))}
					account={selected}
				/>

				<ConfirmationDialog
					open={state.delete}
					onOpenChange={(open) =>
						open ? openModal("delete") : closeModal("delete")
					}
					title={t("accounts.delete.title")}
					description={t("accounts.delete.description", {
						name: selected?.name,
					})}
					confirmText={t("accounts.delete.confirm")}
					variant="destructive"
					isLoading={deleteMutation.isPending}
					onConfirm={() => {
						if (selected) deleteMutation.mutate({ id: selected.id });
					}}
				/>
			</View>
		</Container>
	);
}
