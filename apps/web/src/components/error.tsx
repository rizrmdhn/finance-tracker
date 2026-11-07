import { Button } from "@finance-tracker/ui/components/button";
import { cn } from "@finance-tracker/ui/lib/utils";
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

type Props = ErrorComponentProps & { fullScreen?: boolean };

export function ErrorComponent({ error, reset, fullScreen }: Props) {
	const { t } = useTranslation();

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
					<p className="mb-3 text-center font-semibold">
						{t("errors.validationFailed")}
					</p>
					{renderPrettifiedErrors(prettified)}
				</div>
			);
		}

		// Check if it's a TanStack Router error with Zod validation in cause
		if (
			error instanceof Error &&
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
					<p className="mb-3 text-center font-semibold">
						{t("errors.validationFailed")}
					</p>
					{renderPrettifiedErrors(prettified)}
				</div>
			);
		}

		return (
			<div className="flex max-w-md flex-col items-center gap-4">
				<p className="text-muted-foreground">
					{t("errors.unexpectedDescription")}
				</p>
				{error instanceof Error && error.message && (
					<details className="w-full rounded-lg border bg-muted/50 px-4 py-2 text-left">
						<summary className="cursor-pointer text-muted-foreground text-sm">
							{t("errors.showDetails")}
						</summary>
						<pre className="mt-2 whitespace-pre-wrap break-words font-mono text-destructive text-xs">
							{error.message}
						</pre>
					</details>
				)}
			</div>
		);
	};

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center px-4",
				fullScreen ? "min-h-svh" : "min-h-[70svh]",
			)}
		>
			<div className="flex flex-col items-center space-y-6 text-center">
				<div className="rounded-full bg-destructive/10 p-6">
					<AlertTriangle className="h-16 w-16 text-destructive" />
				</div>
				<div className="flex flex-col items-center space-y-2">
					<h1 className="font-bold text-4xl tracking-tight">
						{t("errors.oops")}
					</h1>
					<h2 className="font-semibold text-2xl">
						{t("errors.somethingWentWrong")}
					</h2>
					{getErrorMessage()}
				</div>
				<div className="flex gap-4">
					<Button
						variant="outline"
						onClick={() => {
							reset();
							router.invalidate();
						}}
					>
						{t("errors.tryAgain")}
					</Button>
					<Button onClick={() => router.navigate({ to: "/" })}>
						{t("errors.goHome")}
					</Button>
				</div>
			</div>
		</div>
	);
}
