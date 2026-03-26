import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
	DrawerContentScrollView,
	DrawerItemList,
} from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useThemeColor } from "@/lib/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function CustomDrawerContent(props: DrawerContentComponentProps) {
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBorder = useThemeColor("border");

	return (
		<DrawerContentScrollView {...props}>
			<View
				style={{
					paddingHorizontal: 16,
					paddingVertical: 12,
					borderBottomWidth: 1,
					borderBottomColor: themeColorBorder,
					marginBottom: 8,
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
				}}
			>
				<Ionicons
					name="wallet-outline"
					size={20}
					color={themeColorForeground}
				/>
				<Text
					style={{
						color: themeColorForeground,
						fontSize: 16,
						fontWeight: "600",
					}}
				>
					Finance Tracker
				</Text>
			</View>
			<DrawerItemList {...props} />
		</DrawerContentScrollView>
	);
}

function DrawerLayout() {
	const { t } = useTranslation();

	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");

	const renderHeaderRight = useCallback(
		() => (
			<View style={{ flexDirection: "row", alignItems: "center" }}>
				<LanguageToggle />
				<ThemeToggle />
			</View>
		),
		[],
	);
	const renderDrawerContent = useCallback(
		(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />,
		[],
	);

	const navItems: {
		name: string;
		title: string;
		icon: IoniconsName;
	}[] = [
		{ name: "index", title: t("sidebar.dashboard"), icon: "home-outline" },
		{ name: "accounts", title: t("sidebar.accounts"), icon: "wallet-outline" },
		{
			name: "transactions",
			title: t("sidebar.transactions"),
			icon: "swap-horizontal-outline",
		},
		{
			name: "recurring",
			title: t("sidebar.recurring"),
			icon: "repeat-outline",
		},
		{
			name: "categories",
			title: t("sidebar.categories"),
			icon: "pricetag-outline",
		},
		{ name: "budgets", title: t("sidebar.budgets"), icon: "flag-outline" },
		{
			name: "settings",
			title: t("sidebar.settings"),
			icon: "settings-outline",
		},
	];

	return (
		<Drawer
			drawerContent={renderDrawerContent}
			screenOptions={{
				headerTintColor: themeColorForeground,
				headerStyle: { backgroundColor: themeColorBackground },
				headerTitleStyle: {
					fontWeight: "600",
					color: themeColorForeground,
				},
				headerRight: renderHeaderRight,
				drawerStyle: { backgroundColor: themeColorBackground },
			}}
		>
			{navItems.map(({ name, title, icon }) => (
				<Drawer.Screen
					key={name}
					name={name}
					options={{
						headerTitle: title,
						drawerLabel: ({ color, focused }) => (
							<Text style={{ color: focused ? color : themeColorForeground }}>
								{title}
							</Text>
						),
						drawerIcon: ({ size, color, focused }) => (
							<Ionicons
								name={icon}
								size={size}
								color={focused ? color : themeColorForeground}
							/>
						),
					}}
				/>
			))}
		</Drawer>
	);
}

export default DrawerLayout;
