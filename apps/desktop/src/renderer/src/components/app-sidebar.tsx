import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@finance-tracker/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Tag, Wallet } from "lucide-react";

const navItems = [
	{ to: "/", label: "Beranda", icon: Home },
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
								<h1 className="flex flex-row items-center justify-start gap-2">
									<Wallet className="size-4 shrink-0" />
									<span className="font-semibold text-base group-data-[collapsible=icon]:hidden">
										Finance Tracker
									</span>
								</h1>
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
		</Sidebar>
	);
}
