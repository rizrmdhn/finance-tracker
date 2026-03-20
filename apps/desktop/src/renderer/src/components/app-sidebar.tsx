import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@finance-tracker/ui/components/dropdown-menu";
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
import { ArrowLeftRight, Home, Moon, Sun, Tag, Wallet } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const navItems = [
	{ to: "/", label: "Beranda", icon: Home },
	{ to: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
	{ to: "/categories", label: "Kategori", icon: Tag },
] as const;

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
	const { location } = useRouterState();
	const { setTheme } = useTheme();

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
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<SidebarMenuButton tooltip="Tema">
										<Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
										<Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
										<span className="group-data-[collapsible=icon]:hidden">
											Ganti Tema
										</span>
									</SidebarMenuButton>
								}
							/>
							<DropdownMenuContent side="right" align="end">
								<DropdownMenuItem onClick={() => setTheme("light")}>
									Light
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setTheme("dark")}>
									Dark
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setTheme("system")}>
									System
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
