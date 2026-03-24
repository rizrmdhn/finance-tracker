import { Wallet } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Icon } from "./ui/icon";
import { Spinner } from "./ui/spinner";

export function SplashScreen() {
	return (
		<Animated.View
			entering={FadeIn.duration(300)}
			className="flex-1 items-center justify-center gap-6 bg-background"
		>
			<Animated.View className="flex-col items-center gap-4">
				<Animated.View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
					<Icon as={Wallet} className="size-8 text-primary-foreground" />
				</Animated.View>
				<Animated.View className="flex-col items-center gap-1">
					<Animated.Text className="font-semibold text-foreground text-xl tracking-tight">
						Finance Tracker
					</Animated.Text>
					<Animated.Text className="text-muted-foreground text-sm">
						Loading your data…
					</Animated.Text>
				</Animated.View>
			</Animated.View>
			<Spinner className="size-8" />
		</Animated.View>
	);
}
