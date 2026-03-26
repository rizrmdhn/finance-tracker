import { SUPPORTED_COLORS } from "@finance-tracker/constants";
import { FlashList } from "@shopify/flash-list";
import { Palette, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
	value?: string;
	onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
	const insets = useSafeAreaInsets();
	const [modalVisible, setModalVisible] = useState(false);

	function handleSelect(color: string) {
		onChange(color);
		setModalVisible(false);
	}

	return (
		<>
			<Pressable
				onPress={() => setModalVisible(true)}
				className="h-10 w-full items-center justify-center rounded-md border border-input bg-background shadow-black/5 shadow-sm dark:bg-input/30"
				accessibilityLabel="Pick color"
			>
				{value ? (
					<View
						className="size-4 rounded-full border border-black/10"
						style={{ backgroundColor: value }}
					/>
				) : (
					<Icon as={Palette} className="size-4 text-muted-foreground" />
				)}
			</Pressable>

			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setModalVisible(false)}
			>
				<View
					className="flex-1 bg-background"
					style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
				>
					{/* Header */}
					<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
						<Text className="font-semibold text-base text-foreground">
							Pick a color
						</Text>
						<Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
							<Icon as={X} className="size-5 text-foreground" />
						</Pressable>
					</View>

					<FlashList
						data={SUPPORTED_COLORS}
						keyExtractor={(item) => item.value}
						numColumns={5}
						contentContainerStyle={{ padding: 16, gap: 8 }}
						// columnWrapperStyle={{ gap: 8 }}
						renderItem={({ item }) => (
							<Pressable
								onPress={() => handleSelect(item.value)}
								accessibilityLabel={item.label}
								className={cn(
									"h-12 flex-1 rounded-md border-2 border-transparent",
									value === item.value && "scale-110 border-foreground/50",
								)}
								style={{ backgroundColor: item.value }}
							/>
						)}
					/>
				</View>
			</Modal>
		</>
	);
}
