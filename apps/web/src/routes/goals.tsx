import { Button } from "@finance-tracker/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@finance-tracker/ui/components/collapsible";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@finance-tracker/ui/components/empty";
import { Skeleton } from "@finance-tracker/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRightIcon, PiggyBankIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pageHead } from "@/lib/page-head";
import { trpc } from "@/lib/trpc";
import GoalCard from "./-components/goal-card";

export const Route = createFileRoute("/goals")({
	component: GoalsComponent,
	head: () =>
		pageHead(
			"Goals",
			"Save toward the things you want and see when you'll reach them.",
		),
});

const GRID_CLASS = "grid gap-3 md:grid-cols-2 xl:grid-cols-3";

function GoalsComponent() {
	const { t } = useTranslation();

	// In list order: priority, then creation date
	const { data: overview = [], isLoading } = useQuery(
		trpc.goal.overview.queryOptions(),
	);

	const activeGoals = overview.filter((item) => item.goal.status === "active");
	const inactiveGoals = overview.filter(
		(item) => item.goal.status !== "active",
	);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="font-semibold text-xl">{t("goals.title")}</h1>
					<p className="max-w-2xl text-muted-foreground text-sm">
						{t("goals.description")}
					</p>
				</div>
				<Button>
					<PlusIcon />
					{t("goals.addGoal")}
				</Button>
			</div>

			{isLoading && (
				<div className={GRID_CLASS}>
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="flex flex-col gap-4 rounded-lg border px-4 py-3"
						>
							<div className="flex items-center gap-3">
								<Skeleton className="size-9 shrink-0 rounded-full" />
								<Skeleton className="h-4 flex-1" />
								<Skeleton className="h-5 w-14 rounded-full" />
							</div>
							<div className="flex flex-col gap-1.5">
								<Skeleton className="h-3 w-40" />
								<Skeleton className="h-2 w-full rounded-full" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
					))}
				</div>
			)}

			{!isLoading && activeGoals.length === 0 && (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PiggyBankIcon />
						</EmptyMedia>
						<EmptyTitle>{t("goals.noGoals")}</EmptyTitle>
						<EmptyDescription>{t("goals.noGoalsDescription")}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="outline">
							<PlusIcon />
							{t("goals.addGoal")}
						</Button>
					</EmptyContent>
				</Empty>
			)}

			{activeGoals.length > 0 && (
				<div className={GRID_CLASS}>
					{activeGoals.map((item) => (
						<GoalCard key={item.goal.id} item={item} />
					))}
				</div>
			)}

			{inactiveGoals.length > 0 && (
				<Collapsible className="flex flex-col gap-3">
					<CollapsibleTrigger
						render={
							<Button
								variant="ghost"
								className="group w-fit text-muted-foreground"
							/>
						}
					>
						<ChevronRightIcon className="transition-transform group-data-panel-open:rotate-90" />
						{t("goals.inactiveGoals", { count: inactiveGoals.length })}
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className={GRID_CLASS}>
							{inactiveGoals.map((item) => (
								<GoalCard key={item.goal.id} item={item} />
							))}
						</div>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
	);
}
