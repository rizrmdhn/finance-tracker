import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import { useUniwind } from "uniwind";

export const THEME = {
	light: {
		background: "#ffffff",
		foreground: "#1c1c1c",
		card: "#ffffff",
		cardForeground: "#1c1c1c",
		popover: "#ffffff",
		popoverForeground: "#1c1c1c",
		primary: "#2a2a2a",
		primaryForeground: "#fafafa",
		secondary: "#f5f5f5",
		secondaryForeground: "#2a2a2a",
		muted: "#f5f5f5",
		mutedForeground: "#7d7d7d",
		accent: "#f5f5f5",
		accentForeground: "#2a2a2a",
		destructive: "#dc2626",
		border: "#ebebeb",
		input: "#ebebeb",
		ring: "#b0b0b0",
		chart1: "#93c5fd",
		chart2: "#3b82f6",
		chart3: "#2563eb",
		chart4: "#1d4ed8",
		chart5: "#1e3a8a",
	},
	dark: {
		background: "#1c1c1c",
		foreground: "#fafafa",
		card: "#2a2a2a",
		cardForeground: "#fafafa",
		popover: "#2a2a2a",
		popoverForeground: "#fafafa",
		primary: "#dedede",
		primaryForeground: "#2a2a2a",
		secondary: "#383838",
		secondaryForeground: "#fafafa",
		muted: "#383838",
		mutedForeground: "#b0b0b0",
		accent: "#505050",
		accentForeground: "#fafafa",
		destructive: "#ef4444",
		border: "rgba(255,255,255,0.1)",
		input: "rgba(255,255,255,0.15)",
		ring: "#7d7d7d",
		chart1: "#93c5fd",
		chart2: "#3b82f6",
		chart3: "#2563eb",
		chart4: "#1d4ed8",
		chart5: "#1e3a8a",
	},
};

export type ThemeColorKey = keyof typeof THEME.light;

export function useThemeColor(key: ThemeColorKey): string {
	const { theme } = useUniwind();
	return THEME[theme as "light" | "dark"][key];
}

export const NAV_THEME: Record<"light" | "dark", Theme> = {
	light: {
		...DefaultTheme,
		colors: {
			background: THEME.light.background,
			border: THEME.light.border,
			card: THEME.light.card,
			notification: THEME.light.destructive,
			primary: THEME.light.primary,
			text: THEME.light.foreground,
		},
	},
	dark: {
		...DarkTheme,
		colors: {
			background: THEME.dark.background,
			border: THEME.dark.border,
			card: THEME.dark.card,
			notification: THEME.dark.destructive,
			primary: THEME.dark.primary,
			text: THEME.dark.foreground,
		},
	},
};
