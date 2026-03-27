import { Check, ChevronDown, X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface SelectOption<T extends string = string> {
	value: T;
	label: string;
	description?: string;
}

interface OptionSelectProps<T extends string> {
	value?: T;
	onChange: (value: T) => void;
	options: SelectOption<T>[];
	placeholder?: string;
	title?: string;
}

export function OptionSelect<T extends string>({
	value,
	onChange,
	options,
	placeholder = "Select an option",
	title = "Select",
}: OptionSelectProps<T>) {
	const insets = useSafeAreaInsets();
	const [modalVisible, setModalVisible] = useState(false);

	const selected = options.find((o) => o.value === value);

	function handleSelect(option: SelectOption<T>) {
		onChange(option.value);
		setModalVisible(false);
	}

	return (
		<>
			<Pressable
				onPress={() => setModalVisible(true)}
				className="h-10 flex-row items-center justify-between rounded-md border border-input bg-background px-3 shadow-black/5 shadow-sm dark:bg-input/30"
			>
				<Text
					className={
						selected
							? "text-foreground text-sm"
							: "text-muted-foreground text-sm"
					}
				>
					{selected ? selected.label : placeholder}
				</Text>
				<Icon as={ChevronDown} className="size-4 text-muted-foreground" />
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
					<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
						<Text className="font-semibold text-base text-foreground">
							{title}
						</Text>
						<Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
							<Icon as={X} className="size-5 text-foreground" />
						</Pressable>
					</View>

					<FlatList
						data={options}
						keyExtractor={(item) => item.value}
						renderItem={({ item }) => {
							const isSelected = item.value === value;
							return (
								<Pressable
									onPress={() => handleSelect(item)}
									className={`flex-row items-center justify-between px-4 py-3 ${isSelected ? "bg-accent" : ""}`}
								>
									<View>
										<Text className="font-medium text-foreground text-sm">
											{item.label}
										</Text>
										{item.description && (
											<Text className="text-muted-foreground text-xs">
												{item.description}
											</Text>
										)}
									</View>
									{isSelected && (
										<Icon as={Check} className="size-4 text-primary" />
									)}
								</Pressable>
							);
						}}
					/>
				</View>
			</Modal>
		</>
	);
}
