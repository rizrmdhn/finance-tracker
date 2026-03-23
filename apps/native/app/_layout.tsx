import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SplashScreen } from "@/components/splash-screen";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import migrations from "@/drizzle/migrations";
import { db } from "@/lib/db";
import { queryClient } from "@/lib/trpc";

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

function StackLayout() {
	return (
		<Stack screenOptions={{}}>
			<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
			<Stack.Screen
				name="modal"
				options={{ title: "Modal", presentation: "modal" }}
			/>
		</Stack>
	);
}

function MigratedApp() {
	const { success, error } = useMigrations(db, migrations);

	if (error) {
		return (
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
				<Text>Migration error: {error.message}</Text>
			</View>
		);
	}

	if (!success) {
		return <SplashScreen />;
	}

	return (
		<AppThemeProvider>
			<HeroUINativeProvider>
				<StackLayout />
			</HeroUINativeProvider>
		</AppThemeProvider>
	);
}

export default function Layout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<KeyboardProvider>
				<QueryClientProvider client={queryClient}>
					<MigratedApp />
				</QueryClientProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
