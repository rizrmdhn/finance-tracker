import { Text, View } from "react-native";

import { Container } from "@/components/container";

export default function Categories() {
	return (
		<Container className="flex-1 items-center justify-center">
			<View className="items-center gap-2">
				<Text className="font-semibold text-2xl text-foreground">Categories</Text>
				<Text className="text-muted text-sm">Coming soon</Text>
			</View>
		</Container>
	);
}
