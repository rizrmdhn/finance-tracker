import type { Category } from "@finance-tracker/types";
import {
	Activity,
	Apple,
	BadgeDollarSign,
	Banknote,
	Beer,
	Bike,
	Book,
	Briefcase,
	Building2,
	Bus,
	Cake,
	Car,
	ChevronDown,
	Coffee,
	Coins,
	CreditCard,
	DollarSign,
	Droplets,
	Dumbbell,
	Film,
	Fuel,
	Gamepad2,
	Gift,
	Headphones,
	Heart,
	Home,
	Landmark,
	Laptop,
	Lightbulb,
	type LucideIcon,
	Monitor,
	Music,
	Package,
	PiggyBank,
	Pill,
	Pizza,
	Plane,
	Receipt,
	Scissors,
	Shirt,
	ShoppingBag,
	ShoppingBasket,
	ShoppingCart,
	Smile,
	Star,
	Stethoscope,
	Store,
	Tag,
	Train,
	TrendingDown,
	TrendingUp,
	Truck,
	Tv,
	Utensils,
	Wallet,
	Wifi,
	Wine,
	Wrench,
	X,
	Zap,
} from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
	Activity,
	Apple,
	BadgeDollarSign,
	Banknote,
	Beer,
	Bike,
	Book,
	Briefcase,
	Building2,
	Bus,
	Cake,
	Car,
	Coffee,
	Coins,
	CreditCard,
	DollarSign,
	Droplets,
	Dumbbell,
	Film,
	Fuel,
	Gamepad2,
	Gift,
	Headphones,
	Heart,
	Home,
	Landmark,
	Laptop,
	Lightbulb,
	Monitor,
	Music,
	Package,
	PiggyBank,
	Pill,
	Pizza,
	Plane,
	Receipt,
	Scissors,
	Shirt,
	ShoppingBag,
	ShoppingBasket,
	ShoppingCart,
	Smile,
	Star,
	Stethoscope,
	Store,
	Tag,
	Train,
	TrendingDown,
	TrendingUp,
	Truck,
	Tv,
	Utensils,
	Wallet,
	Wifi,
	Wine,
	Wrench,
	Zap,
};

interface CategoryComboboxProps {
	value?: string;
	onChange: (value: string | undefined) => void;
	categories: Category[];
	placeholder?: string;
}

export function CategoryCombobox({
	value,
	onChange,
	categories,
	placeholder,
}: CategoryComboboxProps) {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();
	const resolvedPlaceholder = placeholder ?? t("categories.searchCategory");

	const [modalVisible, setModalVisible] = useState(false);
	const [query, setQuery] = useState("");

	const selected = categories.find((c) => c.id === value);
	const SelectedIcon = selected?.icon ? ICON_MAP[selected.icon] : null;

	const filtered = query.trim()
		? categories.filter((c) =>
				c.name.toLowerCase().includes(query.toLowerCase()),
			)
		: categories;

	function handleSelect(categoryId: string) {
		onChange(categoryId);
		setModalVisible(false);
		setQuery("");
	}

	function handleClear() {
		onChange(undefined);
	}

	return (
		<>
			<View className="h-10 flex-row items-center rounded-md border border-input bg-background shadow-black/5 shadow-sm dark:bg-input/30">
				<Pressable
					onPress={() => setModalVisible(true)}
					className="flex-1 flex-row items-center gap-2 px-3"
				>
					{selected ? (
						<>
							{SelectedIcon ? (
								<SelectedIcon size={14} color={selected.color ?? "#94a3b8"} />
							) : (
								<View
									className="size-2.5 rounded-full"
									style={{ backgroundColor: selected.color ?? "#94a3b8" }}
								/>
							)}
							<Text className="text-foreground text-sm">{selected.name}</Text>
						</>
					) : (
						<Text className="text-muted-foreground text-sm">
							{resolvedPlaceholder}
						</Text>
					)}
				</Pressable>
				<View className="flex-row items-center gap-1 pr-3">
					{value && (
						<Pressable onPress={handleClear} hitSlop={8}>
							<Icon as={X} className="size-4 text-muted-foreground" />
						</Pressable>
					)}
					<Pressable onPress={() => setModalVisible(true)} hitSlop={8}>
						<Icon as={ChevronDown} className="size-4 text-muted-foreground" />
					</Pressable>
				</View>
			</View>

			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => {
					setModalVisible(false);
					setQuery("");
				}}
			>
				<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						className="flex-1"
					>
						{/* Header */}
						<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
							<Text className="font-semibold text-base text-foreground">
								{t("common.category")}
							</Text>
							<Pressable
								onPress={() => {
									setModalVisible(false);
									setQuery("");
								}}
								hitSlop={8}
							>
								<Icon as={X} className="size-5 text-foreground" />
							</Pressable>
						</View>

						{/* Search */}
						<View className="px-4 py-3">
							<TextInput
								className={cn(
									"h-10 rounded-md border border-input bg-background px-3 text-base text-foreground",
									Platform.select({
										native: "placeholder:text-muted-foreground/50",
									}),
								)}
								placeholder={resolvedPlaceholder}
								placeholderTextColor="#94a3b8"
								value={query}
								onChangeText={setQuery}
								autoFocus
								autoCorrect={false}
								autoCapitalize="none"
							/>
						</View>

						{/* List */}
					<View style={{ flex: 1 }}>
						<FlatList
							data={filtered}
							keyExtractor={(item) => item.id}
							keyboardShouldPersistTaps="handled"
							ListEmptyComponent={
								<View className="items-center py-8">
									<Text className="text-muted-foreground text-sm">
										No categories found
									</Text>
								</View>
							}
							renderItem={({ item }) => {
								const ItemIcon = item.icon ? ICON_MAP[item.icon] : null;
								const isSelected = item.id === value;
								return (
									<Pressable
										onPress={() => handleSelect(item.id)}
										className={cn(
											"flex-row items-center gap-3 px-4 py-3",
											isSelected && "bg-accent",
										)}
									>
										{ItemIcon ? (
											<ItemIcon size={16} color={item.color ?? "#94a3b8"} />
										) : (
											<View
												className="size-3 rounded-full"
												style={{
													backgroundColor: item.color ?? "#94a3b8",
												}}
											/>
										)}
										<Text className="flex-1 text-foreground text-sm">
											{item.name}
										</Text>
										<Text className="text-muted-foreground text-xs capitalize">
											{item.type}
										</Text>
									</Pressable>
								);
							}}
						/>
					</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</>
	);
}
