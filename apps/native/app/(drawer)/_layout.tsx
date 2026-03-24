import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "@/lib/theme";
import { useCallback } from "react";
import { Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const navItems: {
	name: string;
	title: string;
	icon: IoniconsName;
}[] = [
	{ name: "index", title: "Dashboard", icon: "home-outline" },
	{ name: "accounts", title: "Accounts", icon: "wallet-outline" },
	{ name: "transactions", title: "Transactions", icon: "swap-horizontal-outline" },
	{ name: "recurring", title: "Recurring", icon: "repeat-outline" },
	{ name: "categories", title: "Categories", icon: "pricetag-outline" },
	{ name: "budgets", title: "Budgets", icon: "flag-outline" },
	{ name: "settings", title: "Settings", icon: "settings-outline" },
];

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
				<Ionicons name="wallet-outline" size={20} color={themeColorForeground} />
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
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");

	const renderThemeToggle = useCallback(() => <ThemeToggle />, []);
	const renderDrawerContent = useCallback(
		(props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />,
		[],
	);

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
				headerRight: renderThemeToggle,
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
