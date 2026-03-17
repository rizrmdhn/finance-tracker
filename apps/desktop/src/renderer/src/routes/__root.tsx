import "../index.css";
import { Button } from "@finance-tracker/ui/components/button";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AlertTriangle, FileQuestion } from "lucide-react";
import { Toaster } from "sonner";
import { z } from "zod";
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
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div className="grid h-svh grid-rows-[auto_1fr]">
					<Outlet />
				</div>
				<Toaster position="top-right" richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}

function NotFoundComponent() {
	const router = useRouter();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="flex flex-col items-center space-y-6 text-center">
				<div className="rounded-full bg-muted p-6">
					<FileQuestion className="h-16 w-16 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h1 className="font-bold text-4xl tracking-tight">404</h1>
					<h2 className="font-semibold text-2xl">Halaman Tidak Ditemukan</h2>
					<p className="max-w-md text-muted-foreground">
						Halaman yang Anda cari tidak ada atau telah dipindahkan. Periksa
						kembali URL atau kembali ke halaman utama.
					</p>
				</div>
				<div className="flex gap-4">
					<Button variant="outline" onClick={() => router.history.back()}>
						Kembali
					</Button>
					<Button onClick={() => router.navigate({ to: "/dashboard" })}>
						Ke Dashboard
					</Button>
				</div>
			</div>
		</div>
	);
}

function ErrorComponent({ error }: { error: Error }) {
	const router = useRouter();

	// Format error message based on error type
	const getErrorMessage = () => {
		// Helper function to render prettified errors in human-readable format
		const renderPrettifiedErrors = (errorString: string): React.ReactNode => {
			// Split the prettified error string by newlines
			const lines = errorString.split("\n").filter((line) => line.trim());

			// Combine error message with its path (pattern: "✖ message" followed by "→ at path")
			const errors: string[] = [];
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i]?.trim();
				if (line?.startsWith("✖")) {
					const message = line.replace("✖ ", "");
					const nextLine = lines[i + 1]?.trim();
					if (nextLine?.startsWith("→ at")) {
						const path = nextLine.replace("→ at ", "");
						errors.push(`${path}: ${message}`);
						i++; // Skip the next line since we've already processed it
					} else {
						errors.push(message);
					}
				}
			}

			return (
				<div className="space-y-2">
					{errors.map((errorMsg) => (
						<p key={errorMsg} className="text-destructive text-sm">
							{errorMsg}
						</p>
					))}
				</div>
			);
		};

		// Check if it's a ZodError directly
		if (error instanceof z.ZodError) {
			const prettified = z.prettifyError(error);
			return (
				<div className="max-w-2xl text-left">
					<p className="mb-3 text-center font-semibold">Validasi data gagal:</p>
					{renderPrettifiedErrors(prettified)}
				</div>
			);
		}

		// Check if it's a TanStack Router error with Zod validation in cause
		if (
			"cause" in error &&
			error.cause &&
			typeof error.cause === "object" &&
			"issues" in error.cause &&
			Array.isArray(error.cause.issues)
		) {
			// Convert cause.issues to ZodError format and use prettifyError
			const zodError = new z.ZodError(error.cause.issues as z.core.$ZodIssue[]);
			const prettified = z.prettifyError(zodError);
			return (
				<div className="max-w-2xl text-left">
					<p className="mb-3 text-center font-semibold">Validasi data gagal:</p>
					{renderPrettifiedErrors(prettified)}
				</div>
			);
		}

		return (
			<p className="max-w-md text-muted-foreground">
				{error.message || "Maaf, terjadi kesalahan. Silakan coba lagi nanti."}
			</p>
		);
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="flex flex-col items-center space-y-6 text-center">
				<div className="rounded-full bg-destructive/10 p-6">
					<AlertTriangle className="h-16 w-16 text-destructive" />
				</div>
				<div className="space-y-2">
					<h1 className="font-bold text-4xl tracking-tight">Oops!</h1>
					<h2 className="font-semibold text-2xl">Terjadi Kesalahan</h2>
					{getErrorMessage()}
				</div>
				<div className="flex gap-4">
					<Button variant="outline" onClick={() => window.location.reload()}>
						Muat Ulang
					</Button>
					<Button onClick={() => router.navigate({ to: "/dashboard" })}>
						Ke Dashboard
					</Button>
				</div>
			</div>
		</div>
	);
}
