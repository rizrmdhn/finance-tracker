import { X } from "lucide-react-native";
import type React from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icon";
import { Text } from "./text";

interface ModalSheetProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export function ModalSheet({ open, onClose, title, children }: ModalSheetProps) {
	const insets = useSafeAreaInsets();

	return (
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View
				className="flex-1 bg-background"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					className="flex-1"
				>
					<View className="flex-row items-center justify-between border-border border-b px-4 py-3">
						<Text className="font-semibold text-base text-foreground">
							{title}
						</Text>
						<Pressable onPress={onClose} hitSlop={8}>
							<Icon as={X} className="size-5 text-foreground" />
						</Pressable>
					</View>

					<ScrollView
						contentContainerClassName="gap-4 px-4 py-4"
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						{children}
					</ScrollView>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}
