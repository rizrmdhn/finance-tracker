import {
	Drawer,
	type DrawerContentComponentProps,
	DrawerContentScrollView,
} from "expo-router/drawer";
import {
	ArrowLeftRight,
	Coins,
	Home,
	type LucideIcon,
	PiggyBank,
	Repeat2,
	Settings,
	Tag,
	Target,
	Trash,
	Wallet,
	Wifi,
} from "lucide-react-native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useThemeColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Same icons as the desktop sidebar (apps/web/src/components/app-sidebar.tsx)
const NAV_ICONS: Record<string, LucideIcon> = {
	index: Home,
	accounts: Wallet,
	transactions: ArrowLeftRight,
	recurring: Repeat2,
	categories: Tag,
	budgets: Target,
	goals: PiggyBank,
	trash: Trash,
	sync: Wifi,
	"exchange-rates": Coins,
	settings: Settings,
};

// Styled like the desktop sidebar: neutral active background, rounded-md, 16px icons
function CustomDrawerContent({
	state,
	descriptors,
	navigation,
	...props
}: DrawerContentComponentProps) {
	const { t } = useTranslation();
	const themeColorForeground = useThemeColor("foreground");

	return (
		<DrawerContentScrollView {...props}>
			<View className="border-border mb-2 flex-row items-center gap-2 border-b px-2 pb-3">
				<Wallet size={16} color={themeColorForeground} />
				<Text className="text-foreground text-base font-semibold">
					{t("app.title")}
				</Text>
			</View>
			<View className="gap-1">
				{state.routes.map((route, index) => {
					const focused = index === state.index;
					const Icon = NAV_ICONS[route.name];
					const title = descriptors[route.key].options.title ?? route.name;
					return (
						<Pressable
							key={route.key}
							role="button"
							aria-selected={focused}
							// Same as expo-router's DrawerItemList: navigating closes the drawer
							onPress={() =>
								focused
									? navigation.closeDrawer()
									: navigation.navigate(route.name, route.params)
							}
							className={cn(
								"active:bg-secondary flex-row items-center gap-2 rounded-md px-2 py-3",
								focused && "bg-secondary",
							)}
						>
							{Icon && <Icon size={16} color={themeColorForeground} />}
							<Text
								numberOfLines={1}
								className={cn(
									"text-foreground text-sm",
									focused && "font-medium",
								)}
							>
								{title}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</DrawerContentScrollView>
	);
}

function DrawerLayout() {
	const { t } = useTranslation();
	useAutoSync();

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

	const navItems: { name: string; title: string }[] = [
		{ name: "index", title: t("sidebar.dashboard") },
		{ name: "accounts", title: t("sidebar.accounts") },
		{ name: "transactions", title: t("sidebar.transactions") },
		{ name: "recurring", title: t("sidebar.recurring") },
		{ name: "categories", title: t("sidebar.categories") },
		{ name: "budgets", title: t("sidebar.budgets") },
		{ name: "goals", title: t("sidebar.goals") },
		{ name: "trash", title: t("sidebar.trash") },
		{ name: "sync", title: t("sync.title") },
		{ name: "exchange-rates", title: t("sidebar.exchangeRates") },
		{ name: "settings", title: t("sidebar.settings") },
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
			{navItems.map(({ name, title }) => (
				<Drawer.Screen key={name} name={name} options={{ title }} />
			))}
		</Drawer>
	);
}

export default DrawerLayout;
