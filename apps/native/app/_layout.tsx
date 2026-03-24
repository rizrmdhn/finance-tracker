import "@/global.css";
import "@/lib/i18n";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import * as schema from "@finance-tracker/db";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { SplashScreen } from "@/components/splash-screen";
import { ToastBridge } from "@/components/toast-bridge";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import migrations from "@/drizzle/migrations";
import { useNavigationPersistence } from "@/hooks/use-navigation-persistence";
import { db } from "@/lib/db";
import { queryClient, trpc } from "@/lib/trpc";

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

function StackLayout() {
	useNavigationPersistence();

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
	const { i18n } = useTranslation();
	const { success, error } = useMigrations(db, migrations);

	useEffect(() => {
		if (!success) return;
		db.insert(schema.appSettings)
			.values(
				Object.entries(APP_SETTINGS_DEFAULTS).map(([key, value]) => ({
					key,
					value,
				})),
			)
			.onConflictDoNothing()
			.execute();
	}, [success]);

	const { data: onboarding, isLoading } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "onboarding" }),
	);

	const { data: language } = useQuery(
		trpc.appSetting.get.queryOptions({ key: "language" }),
	);

	useEffect(() => {
		if (language?.value) {
			i18n.changeLanguage(language.value);
		}
	}, [language, i18n]);

	if (error) {
		return (
			<View className="flex-1 items-center justify-center p-4">
				<Text className="mb-2 font-bold text-lg text-red-500">
					Migration error: {error.message}
				</Text>
			</View>
		);
	}

	if (!success || isLoading) {
		return <SplashScreen />;
	}

	if (onboarding?.value === "pending") {
		return <OnboardingScreen />;
	}

	return <StackLayout />;
}

function QueryDevTools() {
	useReactQueryDevTools(queryClient);
	return null;
}

export default function Layout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<KeyboardProvider>
				<QueryClientProvider client={queryClient}>
					<QueryDevTools />
					<AppThemeProvider>
						<HeroUINativeProvider>
							<ToastBridge />
							<MigratedApp />
							<PortalHost />
						</HeroUINativeProvider>
					</AppThemeProvider>
				</QueryClientProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
