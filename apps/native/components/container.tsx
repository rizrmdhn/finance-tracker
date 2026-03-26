import type { PropsWithChildren } from "react";
import {
	RefreshControl,
	ScrollView,
	type ScrollViewProps,
	View,
	type ViewProps,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = AnimatedProps<ViewProps> & {
	className?: string;
	contentContainerClassName?: string;
	isScrollable?: boolean;
	scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
	onRefresh?: () => void;
	refreshing?: boolean;
};

export function Container({
	children,
	className,
	contentContainerClassName,
	isScrollable = true,
	scrollViewProps,
	onRefresh,
	refreshing = false,
	...props
}: PropsWithChildren<Props>) {
	const insets = useSafeAreaInsets();

	return (
		<AnimatedView
			className={cn("flex-1 bg-background", className)}
			style={{
				paddingBottom: insets.bottom,
			}}
			{...props}
		>
			{isScrollable ? (
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
					contentInsetAdjustmentBehavior="automatic"
					refreshControl={
						onRefresh ? (
							<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
						) : undefined
					}
					{...scrollViewProps}
				>
					<View className={cn("flex-1", contentContainerClassName)}>
						{children}
					</View>
				</ScrollView>
			) : (
				<View className={cn("flex-1", contentContainerClassName)}>
					{children}
				</View>
			)}
		</AnimatedView>
	);
}
