import { SUPPORTED_ICONS } from "@finance-tracker/constants";
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
	ImageIcon,
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
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const ICON_MAP: Record<string, LucideIcon> = {
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

interface IconPickerProps {
	value?: string;
	onChange: (value: string) => void;
	color?: string;
}

export function IconPicker({ value, onChange, color }: IconPickerProps) {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();

	const [modalVisible, setModalVisible] = useState(false);
	const [search, setSearch] = useState("");

	const SelectedIcon = value ? ICON_MAP[value] : null;

	const filtered = search.trim()
		? SUPPORTED_ICONS.filter(
				(i) =>
					i.label.toLowerCase().includes(search.toLowerCase()) ||
					i.name.toLowerCase().includes(search.toLowerCase()),
			)
		: SUPPORTED_ICONS;

	function handleSelect(name: string) {
		onChange(name);
		setModalVisible(false);
		setSearch("");
	}

	return (
		<>
			<Pressable
				onPress={() => setModalVisible(true)}
				className="size-10 items-center justify-center rounded-md border border-input bg-background"
			>
				{SelectedIcon ? (
					<SelectedIcon size={16} color={color ?? "#94a3b8"} />
				) : (
					<Icon as={ImageIcon} className="size-4 text-muted-foreground" />
				)}
			</Pressable>

			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => {
					setModalVisible(false);
					setSearch("");
				}}
			>
				<View
					className="flex-1 bg-background"
					style={{ paddingTop: insets.top }}
				>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						className="flex-1"
					>
						{/* Header */}
						<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
							<Text className="font-semibold text-base text-foreground">
								{t("common.selectIcon")}
							</Text>
							<Pressable
								onPress={() => {
									setModalVisible(false);
									setSearch("");
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
								placeholder={t("common.searchIcon")}
								placeholderTextColor="#94a3b8"
								value={search}
								onChangeText={setSearch}
								autoCorrect={false}
								autoCapitalize="none"
							/>
						</View>

						{/* Grid */}
						<ScrollView
							contentContainerClassName="flex-row flex-wrap gap-1 px-4 pb-8"
							keyboardShouldPersistTaps="handled"
						>
							{filtered.map(({ name, label }) => {
								const ItemIcon = ICON_MAP[name];
								if (!ItemIcon) return null;
								const isSelected = value === name;
								return (
									<Pressable
										key={name}
										onPress={() => handleSelect(name)}
										accessibilityLabel={label}
										className={cn(
											"size-10 items-center justify-center rounded-md",
											isSelected ? "bg-accent" : "active:bg-accent/50",
										)}
									>
										<ItemIcon
											size={18}
											color={isSelected ? (color ?? "#94a3b8") : "#94a3b8"}
										/>
									</Pressable>
								);
							})}
							{filtered.length === 0 && (
								<View className="w-full items-center py-8">
									<Text className="text-muted-foreground text-sm">
										{t("common.noIconsFound")}
									</Text>
								</View>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</>
	);
}
