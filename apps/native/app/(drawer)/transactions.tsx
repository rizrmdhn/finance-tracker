import type { TransactionInput } from "@finance-tracker/schema";
import type { Transaction } from "@finance-tracker/types";
import { createId } from "@paralleldrive/cuid2";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
	ArrowDownLeft,
	ArrowLeftRight,
	ArrowUpRight,
	PencilIcon,
	PiggyBank,
	PlusCircle,
	ScanText,
	Search,
	Trash2Icon,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Container } from "@/components/container";
import CreateTransactionDialog from "@/components/form/create-transaction-dialog";
import EditTransactionDialog from "@/components/form/edit-transaction-dialog";
import { ICON_MAP } from "@/components/form/icon-picker";
import { ReceiptScanner } from "@/components/receipt-scanner";
import { Button } from "@/components/ui/button";
import { Icon as IconComp } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import useModalState from "@/hooks/use-modal-state";
import type { ParsedReceipt } from "@/lib/receipt-parser";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import { queryClient, trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";

const typeConfig = {
	income: {
		iconClass: "bg-green-500/10 text-green-600",
		amountClass: "text-green-600",
		Icon: ArrowDownLeft,
		prefix: "+",
	},
	expense: {
		iconClass: "bg-red-500/10 text-red-500",
		amountClass: "text-red-500",
		Icon: ArrowUpRight,
		prefix: "-",
	},
	savings: {
		iconClass: "bg-violet-500/10 text-violet-500",
		amountClass: "text-violet-500",
		Icon: PiggyBank,
		prefix: "-",
	},
	transfer: {
		iconClass: "bg-blue-500/10 text-blue-500",
		amountClass: "text-muted-foreground",
		Icon: ArrowLeftRight,
		prefix: "",
	},
} as const;

type CategoryType = keyof typeof typeConfig;

export default function Transactions() {
	const { t } = useTranslation();
	const { format } = useFormatCurrency();

	const { state, openModal, closeModal } = useModalState({
		create: false,
		edit: false,
		delete: false,
		scan: false,
	});

	const [selected, setSelected] = useState<Transaction | null>(null);
	const [scannedDefaults, setScannedDefaults] = useState<
		Partial<TransactionInput> | undefined
	>(undefined);
	const [rawQuery, setRawQuery] = useState("");
	const [query, setQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setQuery(rawQuery), 300);
		return () => clearTimeout(timer);
	}, [rawQuery]);

	const {
		data,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		isRefetching,
		refetch,
	} = useInfiniteQuery(
		trpc.transaction.infiniteList.infiniteQueryOptions(
			{ limit: 25, query: query || undefined },
			{
				getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
				initialCursor: undefined as string | undefined,
			},
		),
	);

	const { data: accounts = [] } = useQuery(trpc.account.list.queryOptions());

	const accountsMap = useMemo(
		() => new Map(accounts.map((a) => [a.id, a.name])),
		[accounts],
	);

	const items = useMemo(
		() => data?.pages.flatMap((page) => page.data) ?? [],
		[data],
	);

	const deleteMutation = useMutation(
		trpc.transaction.delete.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.list.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.summary.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.transaction.infiniteList.queryKey(),
					}),
					queryClient.invalidateQueries(
						trpc.transaction.listDeleted.queryOptions(),
					),
				]);
				globalSuccessToast(t("transactions.toast.deleted"));
				closeModal("delete");
				setSelected(null);
			},
			onError: (error) => {
				globalErrorToast(
					t("transactions.toast.deleteFailed", { message: error.message }),
				);
			},
		}),
	);

	function handleEdit(tx: Transaction) {
		setSelected(tx);
		openModal("edit");
	}

	function handleDelete(tx: Transaction) {
		setSelected(tx);
		openModal("delete");
	}

	function handleScanSuccess(parsed: ParsedReceipt) {
		const defaults: Partial<TransactionInput> = {};
		if (parsed.amount !== null) defaults.amount = parsed.amount;
		if (parsed.note) defaults.note = parsed.note;
		if (parsed.date !== null) defaults.date = parsed.date;
		setScannedDefaults(defaults);
		openModal("create");
	}

	const ListHeader = (
		<View className="flex flex-col gap-3 py-3">
			<View className="flex flex-row items-center justify-between">
				<View>
					<Text className="font-semibold text-xl">
						{t("transactions.title")}
					</Text>
					{isLoading ? (
						<Skeleton className="mt-1 h-4 w-24" />
					) : (
						<Text className="text-muted-foreground text-sm">
							{t("transactions.transactionCount", { count: items.length })}
						</Text>
					)}
				</View>
				<View className="flex-row items-center gap-2">
					<Button size="sm" variant="outline" onPress={() => openModal("scan")}>
						<IconComp as={ScanText} className="size-4" />
					</Button>
					<Button
						size="sm"
						onPress={() => {
							setScannedDefaults(undefined);
							openModal("create");
						}}
					>
						<IconComp as={PlusCircle} className="size-4" />
						<Text>{t("transactions.addTransaction")}</Text>
					</Button>
				</View>
			</View>
			<View className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3 shadow-black/5 shadow-sm dark:bg-input/30">
				<IconComp
					as={Search}
					className="size-4 shrink-0 text-muted-foreground"
				/>
				<Input
					value={rawQuery}
					onChangeText={setRawQuery}
					placeholder={t("transactions.searchPlaceholder")}
					className="flex-1 border-0 px-0 shadow-none"
					autoCorrect={false}
					autoCapitalize="none"
					clearButtonMode="while-editing"
					style={{
						backgroundColor: "transparent",
					}}
				/>
			</View>
		</View>
	);

	const ListEmpty = isLoading ? (
		<View className="flex flex-col gap-3">
			{[...Array(8)].map((_) => (
				<View
					key={createId()}
					className="flex flex-col gap-2 rounded-lg border border-border px-4 py-3"
				>
					<View className="flex flex-row items-center gap-3">
						<Skeleton className="size-8 shrink-0 rounded-full" />
						<View className="flex min-w-0 flex-1 flex-col gap-1">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-20" />
						</View>
						<Skeleton className="h-4 w-16 shrink-0" />
					</View>
					<View className="flex flex-row items-center gap-2">
						<Skeleton className="h-5 w-20 rounded-full" />
						<View className="flex-1" />
						<Skeleton className="size-6" />
						<Skeleton className="size-6" />
					</View>
				</View>
			))}
		</View>
	) : (
		<View className="flex flex-col items-center gap-3 py-12">
			<Text className="text-muted-foreground text-sm">
				{t("transactions.noTransactions")}
			</Text>
			<Button variant="outline" size="sm" onPress={() => openModal("create")}>
				<Text>{t("transactions.addTransaction")}</Text>
			</Button>
		</View>
	);

	const ListFooter = isFetchingNextPage ? (
		<View className="flex items-center py-4">
			<ActivityIndicator />
		</View>
	) : null;

	return (
		<Container isScrollable={false}>
			<FlashList
				data={items}
				keyExtractor={(item) => item.id}
				ListHeaderComponent={ListHeader}
				ListEmptyComponent={ListEmpty}
				ListFooterComponent={ListFooter}
				contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
				onEndReached={() => {
					if (hasNextPage && !isFetchingNextPage) fetchNextPage();
				}}
				onEndReachedThreshold={0.5}
				refreshing={isRefetching && !isFetchingNextPage}
				onRefresh={refetch}
				renderItem={({ item }) => {
					const categoryType =
						(item.category?.type as CategoryType | undefined) ?? "transfer";
					const config = typeConfig[categoryType] ?? typeConfig.transfer;
					const { iconClass, amountClass, prefix } = config;
					const CategoryIcon = item.category?.icon
						? ICON_MAP[item.category.icon]
						: config.Icon;

					return (
						<View className="mb-3 flex flex-col gap-2 rounded-lg border border-border px-6 py-3">
							{/* Top row: icon + label + amount */}
							<View className="flex flex-row items-center gap-3">
								<View
									className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
								>
									<IconComp as={CategoryIcon} className="size-4" />
								</View>

								<View className="flex min-w-0 flex-1 flex-col">
									<Text className="truncate font-medium text-sm">
										{item.note ?? item.category?.name ?? "—"}
									</Text>
									<Text className="text-muted-foreground text-xs">
										{accountsMap.get(item.accountId) ?? "—"}
									</Text>
								</View>

								<Text className={`shrink-0 font-medium text-sm ${amountClass}`}>
									{prefix}
									{format(item.amount)}
								</Text>
							</View>

							{/* Bottom row: date + actions */}
							<View className="flex flex-row items-center gap-2">
								<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
									{formatDate(item.date)}
								</Text>

								{item.category?.name && (
									<Text className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
										{item.category.name}
									</Text>
								)}

								<View className="flex-1" />

								<View className="flex shrink-0 flex-row items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										onPress={() => handleEdit(item)}
									>
										<IconComp as={PencilIcon} className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive"
										onPress={() => handleDelete(item)}
									>
										<IconComp
											as={Trash2Icon}
											className="size-3.5 text-destructive"
										/>
									</Button>
								</View>
							</View>
						</View>
					);
				}}
			/>

			<CreateTransactionDialog
				open={state.create}
				setIsOpen={(open) =>
					open ? openModal("create") : closeModal("create")
				}
				defaultValues={scannedDefaults}
			/>

			<EditTransactionDialog
				open={state.edit}
				setIsOpen={(open) => (open ? openModal("edit") : closeModal("edit"))}
				transaction={selected}
			/>

			<ConfirmationDialog
				open={state.delete}
				onOpenChange={(open) =>
					open ? openModal("delete") : closeModal("delete")
				}
				title={t("transactions.delete.title")}
				description={t("transactions.delete.description", {
					name: selected?.note ?? selected?.categoryId ?? "",
				})}
				confirmText={t("transactions.delete.confirm")}
				variant="destructive"
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (selected) deleteMutation.mutate({ id: selected.id });
				}}
			/>

			<ReceiptScanner
				open={state.scan}
				onClose={() => closeModal("scan")}
				onScanSuccess={handleScanSuccess}
			/>
		</Container>
	);
}
