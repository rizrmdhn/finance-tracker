import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { createMMKV } from "react-native-mmkv";
import { Uniwind, useUniwind } from "uniwind";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "theme";
const storage = createMMKV({ id: "app-theme" });

function readStoredTheme(): ThemePreference {
	const stored = storage.getString(THEME_KEY);
	return stored === "light" || stored === "dark" ? stored : "system";
}

// Apply before the first render so the app doesn't flash the wrong theme
Uniwind.setTheme(readStoredTheme());

type AppThemeContextType = {
	/** The user's choice — may be "system" */
	theme: ThemePreference;
	/** The theme actually on screen */
	resolvedTheme: "light" | "dark";
	setTheme: (theme: ThemePreference) => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined,
);

export const AppThemeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { theme: uniwindTheme } = useUniwind();
	const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);

	const resolvedTheme = uniwindTheme === "dark" ? "dark" : "light";

	const setTheme = useCallback((newTheme: ThemePreference) => {
		storage.set(THEME_KEY, newTheme);
		Uniwind.setTheme(newTheme);
		setThemeState(newTheme);
	}, []);

	const value = useMemo<AppThemeContextType>(
		() => ({ theme, resolvedTheme, setTheme }),
		[theme, resolvedTheme, setTheme],
	);

	return (
		<AppThemeContext.Provider value={value}>
			{children}
		</AppThemeContext.Provider>
	);
};

export function useAppTheme() {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
}
