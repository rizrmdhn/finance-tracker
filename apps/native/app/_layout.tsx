import "@/global.css";
import "@/lib/i18n";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { seedDatabase } from "@finance-tracker/db";
import { CRDT_TABLES } from "@finance-tracker/constants";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useMigrations } from "drizzle-orm/op-sqlite/migrator";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { DevToolsBubble } from "react-native-react-query-devtools";
import { Toaster } from "sonner-native";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { SplashScreen } from "@/components/splash-screen";
import { Text } from "@/components/ui/text";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import bundledMigrations from "@/drizzle/migrations";
import { useNavigationPersistence } from "@/hooks/use-navigation-persistence";
import { db, sqlite } from "@/lib/db";
import { queryClient, trpc } from "@/lib/trpc";

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

async function setupCRDT() {
	for (const table of CRDT_TABLES) {
		await sqlite.execute(`SELECT crsql_as_crr('${table}')`);
	}
}

function StackLayout() {
	useNavigationPersistence();

	return (
		<Stack screenOptions={{}}>
			<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
		</Stack>
	);
}

function MigratedApp() {
	const { i18n } = useTranslation();
	const { success, error } = useMigrations(db, bundledMigrations);
	const [isSeeded, setIsSeeded] = useState(false);

	useEffect(() => {
		if (!success) return;
		setupCRDT()
			.then(() => seedDatabase(db))
			.then(() => setIsSeeded(true))
			.catch((e: unknown) => console.error("[cr-sqlite] setup failed:", e));
	}, [success]);

	const { data: onboarding, isLoading } = useQuery({
		...trpc.appSetting.get.queryOptions({ key: "onboarding" }),
		enabled: isSeeded,
	});

	const { data: language } = useQuery({
		...trpc.appSetting.get.queryOptions({ key: "language" }),
		enabled: isSeeded,
	});

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
					{__DEV__ && <QueryDevTools />}
					<AppThemeProvider>
						<MigratedApp />
						<PortalHost />
						<Toaster richColors />
					</AppThemeProvider>
					{__DEV__ && <DevToolsBubble queryClient={queryClient} />}
				</QueryClientProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
