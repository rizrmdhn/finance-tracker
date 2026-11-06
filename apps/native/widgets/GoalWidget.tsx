"use no memo";

import type { GoalStatus, SupportedCurrency } from "@finance-tracker/constants";
import { type DurationParts, formatCurrency } from "@finance-tracker/utils";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { formatGoalTimeLeft } from "../lib/goal-text";
import i18n from "../lib/i18n";
import type { GoalWidgetData, WidgetGoal } from "../lib/widget-storage";
import { fitRows } from "./layout";

const GOALS_URI = "finance-tracker:///goals";
const STALE_MS = 60 * 60 * 1000; // 1 hour
const MAX_GOALS = 3;

/** A `goal.overview` item, as far as the widget needs it. */
interface OverviewItem {
	goal: {
		id: string;
		name: string;
		color: string;
		targetAmount: number;
		currency: SupportedCurrency;
		status: GoalStatus;
	};
	progress: { total: number; isReached: boolean };
	estimate: {
		completion: { status: string };
		duration: { main: DurationParts | null };
	} | null;
}

/** The top active goals (the overview is already in priority order). */
export function toWidgetGoals(overview: OverviewItem[]): WidgetGoal[] {
	return overview
		.filter((item) => item.goal.status === "active")
		.slice(0, MAX_GOALS)
		.map(({ goal, progress, estimate }) => ({
			id: goal.id,
			name: goal.name,
			color: goal.color,
			total: progress.total,
			targetAmount: goal.targetAmount,
			currency: goal.currency,
			isReached: progress.isReached,
			timeLeft:
				estimate?.completion.status === "estimated"
					? estimate.duration.main
					: null,
		}));
}

type Props = { data: GoalWidgetData | null; height: number };

export function GoalWidget({ data, height }: Props) {
	const t = i18n.getFixedT(data?.language ?? i18n.language);
	const goals = (data?.goals ?? []).slice(0, fitRows(height, MAX_GOALS));

	const isStale =
		!!data?.lastUpdated && Date.now() - data.lastUpdated > STALE_MS;

	return (
		// No flexDirection = FrameLayout: children stack on top of each other
		<FlexWidget
			clickAction="OPEN_URI"
			clickActionData={{ uri: GOALS_URI }}
			style={{
				backgroundColor: "#09090b",
				borderRadius: 16,
				width: "match_parent",
				height: "match_parent",
			}}
		>
			{/* Main content */}
			<FlexWidget
				style={{
					flexDirection: "column",
					padding: 16,
					width: "match_parent",
					height: "match_parent",
				}}
			>
				{/* Header */}
				<TextWidget
					text={t("goals.widget.title")}
					style={{
						fontSize: 15,
						fontWeight: "bold",
						color: "#fafafa",
						marginBottom: 10,
					}}
				/>

				{goals.length === 0 ? (
					<FlexWidget
						style={{
							flex: 1,
							width: "match_parent",
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						<TextWidget
							text={`${t("goals.widget.noGoals")}\n${t("goals.widget.openApp")}`}
							style={{ fontSize: 12, color: "#71717a", textAlign: "center" }}
						/>
					</FlexWidget>
				) : (
					goals.map((goal) => {
						const percent =
							goal.targetAmount > 0
								? Math.min(goal.total / goal.targetAmount, 1)
								: 0;
						const remaining = 1 - percent;
						const color = goal.color as `#${string}`;

						return (
							<FlexWidget
								key={goal.id}
								style={{
									flexDirection: "column",
									marginBottom: 10,
									width: "match_parent",
								}}
							>
								{/* Name + reached badge / percent */}
								<FlexWidget
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
										marginBottom: 3,
										width: "match_parent",
									}}
								>
									<FlexWidget style={{ flex: 1 }}>
										<TextWidget
											text={goal.name}
											maxLines={1}
											truncate="END"
											style={{ fontSize: 12, fontWeight: "bold", color }}
										/>
									</FlexWidget>
									<TextWidget
										text={
											goal.isReached
												? t("goals.status.reached")
												: t("goals.card.percent", {
														percent: Math.floor(percent * 100),
													})
										}
										style={{
											fontSize: 10,
											color: goal.isReached ? "#22c55e" : "#a1a1aa",
										}}
									/>
								</FlexWidget>

								{/* Progress bar using flex ratio */}
								<FlexWidget
									style={{
										flexDirection: "row",
										height: 4,
										borderRadius: 2,
										backgroundColor: "#27272a",
										marginBottom: 3,
										width: "match_parent",
									}}
								>
									{percent > 0 && (
										<FlexWidget
											style={{
												flex: percent,
												height: 4,
												backgroundColor: color,
												borderRadius: 2,
											}}
										/>
									)}
									{remaining > 0 && (
										<FlexWidget style={{ flex: remaining, height: 4 }} />
									)}
								</FlexWidget>

								{/* Progress amounts + time left */}
								<FlexWidget
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
										width: "match_parent",
									}}
								>
									<TextWidget
										text={t("goals.card.progress", {
											current: formatCurrency(goal.total, goal.currency),
											target: formatCurrency(goal.targetAmount, goal.currency),
										})}
										style={{ fontSize: 10, color: "#71717a" }}
									/>
									{!goal.isReached && goal.timeLeft && (
										<TextWidget
											text={formatGoalTimeLeft(t, goal.timeLeft)}
											style={{ fontSize: 10, color: "#71717a" }}
										/>
									)}
								</FlexWidget>
							</FlexWidget>
						);
					})
				)}
			</FlexWidget>

			{/* Stale overlay — stacks on top via FrameLayout (no position needed) */}
			{isStale && (
				<FlexWidget
					clickAction="REFRESH_WIDGET"
					style={{
						width: "match_parent",
						height: "match_parent",
						backgroundColor: "#B309090b" as `#${string}`,
						borderRadius: 16,
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<TextWidget
						text={t("goals.widget.tapToRefresh")}
						style={{
							fontSize: 14,
							fontWeight: "bold",
							color: "#fafafa",
						}}
					/>
					<TextWidget
						text={t("goals.widget.staleMessage")}
						style={{
							fontSize: 11,
							color: "#a1a1aa",
							marginTop: 4,
						}}
					/>
				</FlexWidget>
			)}
		</FlexWidget>
	);
}
