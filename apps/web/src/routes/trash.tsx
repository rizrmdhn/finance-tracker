import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/trash")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/trash") {
			throw redirect({ to: "/trash/transactions" });
		}
	},
	component: RouteComponent,
	head: () => pageHead("Trash", "View and manage deleted items."),
});

const tabClass =
	"px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
const activeTabClass = "border-b-2 border-primary text-foreground";

function RouteComponent() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex border-b">
				<Link
					to="/trash/transactions"
					className={tabClass}
					activeProps={{ className: activeTabClass }}
				>
					{t("trash.transactions")}
				</Link>
				<Link
					to="/trash/categories"
					className={tabClass}
					activeProps={{ className: activeTabClass }}
				>
					{t("trash.categories")}
				</Link>
			</div>
			<Outlet />
		</div>
	);
}
