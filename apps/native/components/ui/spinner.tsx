import { LoaderCircle, type LucideProps } from "lucide-react-native";
import { useEffect } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

type SpinnerProps = LucideProps;

function Spinner({ className, ...props }: SpinnerProps) {
	const rotation = useSharedValue(0);

	useEffect(() => {
		rotation.value = withRepeat(
			withTiming(360, { duration: 1000, easing: Easing.linear }),
			-1,
		);
		return () => cancelAnimation(rotation);
	}, [rotation]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	return (
		<Animated.View style={animatedStyle}>
			<Icon
				as={LoaderCircle}
				className={cn("size-4 text-foreground", className)}
				{...props}
			/>
		</Animated.View>
	);
}

export { Spinner };
