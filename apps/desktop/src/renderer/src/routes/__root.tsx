import "../index.css";
import { Separator } from "@finance-tracker/ui/components/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@finance-tracker/ui/components/sidebar";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	ErrorComponent,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { NotFoundComponent } from "@/components/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { pageHead } from "../../lib/page-head";
import type { trpc } from "../../lib/trpc";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent,
	head: () => ({
		...pageHead(
			"Finance Tracker",
			"Track your finances with ease. Manage your income, expenses, and budgets all in one place.",
		),
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
				<SidebarProvider
					style={
						{
							"--sidebar-width": "calc(var(--spacing) * 72)",
							"--header-height": "calc(var(--spacing) * 12)",
						} as React.CSSProperties
					}
				>
					<AppSidebar />
					<SidebarInset>
						<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
							<div className="flex w-full items-center gap-1">
								<SidebarTrigger className="-ml-1" />
								<Separator
									orientation="vertical"
									className="mx-2 data-[orientation=vertical]:h-4"
								/>
							</div>
						</header>
						<Outlet />
					</SidebarInset>
				</SidebarProvider>
				<Toaster position="top-right" richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
