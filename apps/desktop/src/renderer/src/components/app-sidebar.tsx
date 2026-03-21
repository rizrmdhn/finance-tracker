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
import { ArrowLeftRight, Home, Settings, Tag, Wallet } from "lucide-react";

const navItems = [
	{ to: "/", label: "Beranda", icon: Home },
	{ to: "/accounts", label: "Akun", icon: Wallet },
	{ to: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
	{ to: "/categories", label: "Kategori", icon: Tag },
] as const;

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { location } = useRouterState();

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
							tooltip="Pengaturan"
						>
							<Settings />
							<span>Pengaturan</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
