import { Button } from "@finance-tracker/ui/components/button";
import { useRouter } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NotFoundComponent() {
	const { t } = useTranslation();

	const router = useRouter();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="flex flex-col items-center space-y-6 text-center">
				<div className="rounded-full bg-muted p-6">
					<FileQuestion className="h-16 w-16 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h1 className="font-bold text-4xl tracking-tight">404</h1>
					<h2 className="font-semibold text-2xl">{t("errors.pageNotFound")}</h2>
					<p className="max-w-md text-muted-foreground">
						{t("errors.pageNotFoundDescription")}
					</p>
				</div>
				<div className="flex gap-4">
					<Button variant="outline" onClick={() => router.history.back()}>
						{t("errors.goBack")}
					</Button>
					<Button onClick={() => router.navigate({ to: "/" })}>
						{t("errors.goHome")}
					</Button>
				</div>
			</div>
		</div>
	);
}
