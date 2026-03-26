import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@finance-tracker/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	ArrowLeftRight,
	Home,
	Repeat2,
	Settings,
	Tag,
	Target,
	Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { location } = useRouterState();
	const { t } = useTranslation();

	const navItems = [
		{ to: "/", label: t("sidebar.dashboard"), icon: Home },
		{ to: "/accounts", label: t("sidebar.accounts"), icon: Wallet },
		{
			to: "/transactions",
			label: t("sidebar.transactions"),
			icon: ArrowLeftRight,
		},
		{ to: "/recurring", label: t("sidebar.recurring"), icon: Repeat2 },
		{ to: "/categories", label: t("sidebar.categories"), icon: Tag },
		{ to: "/budgets", label: t("sidebar.budgets"), icon: Target },
	] as const;

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="data-[slot=sidebar-menu-button]:p-1.5!"
							render={
								<div className="flex flex-row items-center justify-start gap-2">
									<Wallet className="size-4 shrink-0" />
									<span className="font-semibold text-base group-data-[collapsible=icon]:hidden">
										Finance Tracker
									</span>
								</div>
							}
						/>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map(({ to, label, icon: Icon }) => (
								<SidebarMenuItem key={to}>
									<SidebarMenuButton
										render={<Link to={to} />}
										isActive={location.pathname === to}
										tooltip={label}
									>
										<Icon />
										<span>{label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={<Link to="/settings" />}
							isActive={location.pathname === "/settings"}
							tooltip={t("sidebar.settings")}
						>
							<Settings />
							<span>{t("sidebar.settings")}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
