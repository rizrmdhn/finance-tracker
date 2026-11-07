import * as Haptics from "expo-haptics";
import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	type ThemePreference,
	useAppTheme,
} from "@/contexts/app-theme-context";

export const THEME_OPTIONS = [
	{ value: "light", icon: Sun, labelKey: "settings.appearance.light" },
	{ value: "dark", icon: Moon, labelKey: "settings.appearance.dark" },
	{ value: "system", icon: Monitor, labelKey: "settings.appearance.system" },
] as const satisfies readonly {
	value: ThemePreference;
	icon: LucideIcon;
	labelKey: string;
}[];

export function ThemeToggle() {
	const { t } = useTranslation();
	const { theme, resolvedTheme, setTheme } = useAppTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="px-2.5">
				<Animated.View key={resolvedTheme} entering={ZoomIn} exiting={FadeOut}>
					<Icon
						as={resolvedTheme === "dark" ? Moon : Sun}
						className="size-5 text-foreground"
					/>
				</Animated.View>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuRadioGroup
					value={theme}
					onValueChange={(value) => {
						if (Platform.OS === "ios") {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						}
						setTheme(value as ThemePreference);
					}}
				>
					{THEME_OPTIONS.map(({ value, icon, labelKey }) => (
						<DropdownMenuRadioItem key={value} value={value}>
							<Icon as={icon} className="size-4 text-popover-foreground" />
							<Text>{t(labelKey)}</Text>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
