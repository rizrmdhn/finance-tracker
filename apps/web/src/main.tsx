import { QueryClientProvider } from "@tanstack/react-query";
import {
	createBrowserHistory,
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { SplashScreen } from "./components/splash-screen";
import { queryClient, trpc } from "./lib/trpc";
import { routeTree } from "./routeTree.gen";

const isElectron = typeof window !== "undefined" && !!window.electronApp;

const router = createRouter({
	routeTree,
	history: isElectron
		? createMemoryHistory({ initialEntries: ["/"] })
		: createBrowserHistory(),
	defaultPreload: "intent",
	scrollRestoration: true,
	context: { trpc, queryClient },
	defaultPendingComponent: () => <SplashScreen />,
	Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
