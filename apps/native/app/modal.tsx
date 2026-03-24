import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Container } from "@/components/container";
import { Text } from "@/components/ui/text";
import { useThemeColor } from "@/lib/theme";

function Modal() {
	const accentForegroundColor = useThemeColor("accentForeground");

	function handleClose() {
		router.back();
	}

	return (
		<Container>
			<View className="flex-1 items-center justify-center p-4">
				<View className="w-full max-w-sm rounded-lg bg-secondary p-5">
					<View className="items-center">
						<View className="mb-3 h-12 w-12 items-center justify-center rounded-lg bg-accent">
							<Ionicons
								name="checkmark"
								size={24}
								color={accentForegroundColor}
							/>
						</View>
						<Text className="mb-1 font-medium text-foreground text-lg">
							Modal Screen
						</Text>
						<Text className="mb-4 text-center text-muted-foreground text-sm">
							This is an example modal screen for dialogs and confirmations.
						</Text>
					</View>
					<Pressable
						onPress={handleClose}
						className="h-9 w-full items-center justify-center rounded-md bg-primary"
					>
						<Text className="font-medium text-primary-foreground text-sm">
							Close
						</Text>
					</Pressable>
				</View>
			</View>
		</Container>
	);
}

export default Modal;
