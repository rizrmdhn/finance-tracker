import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ title: "Not Found" }} />
			<Container>
				<View className="flex-1 items-center justify-center p-4">
					<View className="max-w-sm items-center rounded-lg border border-border bg-card p-6">
						<Text className="mb-3 text-4xl">🤔</Text>
						<Text className="mb-1 font-medium text-foreground text-lg">
							Page Not Found
						</Text>
						<Text className="mb-4 text-center text-muted-foreground text-sm">
							The page you're looking for doesn't exist.
						</Text>
						<Link href="/" asChild>
							<Button size="sm">
								<Text>Go Home</Text>
							</Button>
						</Link>
					</View>
				</View>
			</Container>
		</>
	);
}
