"use no memo";

import type { BudgetWithSpent } from "@finance-tracker/types";
import { formatCurrency } from "@finance-tracker/utils";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import i18n from "../lib/i18n";
import type { WidgetBudget, WidgetData } from "../lib/widget-storage";
import { fitRows } from "./layout";

const BUDGETS_URI = "finance-tracker:///budgets";
const STALE_MS = 60 * 60 * 1000; // 1 hour
const MAX_BUDGETS = 4;

function usage(budget: { spent: number; amount: number }) {
	return budget.amount > 0 ? budget.spent / budget.amount : 0;
}

/** The budgets that need attention most: over budget first, then by share used. */
export function toWidgetBudgets(budgets: BudgetWithSpent[]): WidgetBudget[] {
	return [...budgets]
		.sort((a, b) =>
			a.isOverBudget !== b.isOverBudget
				? a.isOverBudget
					? -1
					: 1
				: usage(b) - usage(a),
		)
		.slice(0, MAX_BUDGETS)
		.map((b) => ({
			id: b.id,
			amount: b.amount,
			spent: b.spent,
			remaining: b.remaining,
			isOverBudget: b.isOverBudget,
			period: b.period,
			currency: b.currency,
			category: b.category
				? { name: b.category.name, color: b.category.color }
				: null,
		}));
}

type Props = { data: WidgetData | null; height: number };

export function BudgetWidget({ data, height }: Props) {
	const t = i18n.getFixedT(data?.language ?? i18n.language);
	const budgets = (data?.budgets ?? []).slice(0, fitRows(height, MAX_BUDGETS));

	const isStale =
		!!data?.lastUpdated && Date.now() - data.lastUpdated > STALE_MS;

	return (
		// No flexDirection = FrameLayout: children stack on top of each other
		<FlexWidget
			clickAction="OPEN_URI"
			clickActionData={{ uri: BUDGETS_URI }}
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
					text={t("budgets.title")}
					style={{
						fontSize: 15,
						fontWeight: "bold",
						color: "#fafafa",
						marginBottom: 10,
					}}
				/>

				{budgets.length === 0 ? (
					<FlexWidget
						style={{
							flex: 1,
							width: "match_parent",
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						<TextWidget
							text={`${t("budgets.widget.noBudgets")}\n${t("budgets.widget.openApp")}`}
							style={{ fontSize: 12, color: "#71717a", textAlign: "center" }}
						/>
					</FlexWidget>
				) : (
					budgets.map((budget) => {
						const percent = Math.min(usage(budget), 1);
						const remaining = 1 - percent;

						return (
							<FlexWidget
								key={budget.id}
								style={{
									flexDirection: "column",
									marginBottom: 10,
									width: "match_parent",
								}}
							>
								{/* Category name + period/over-budget badge */}
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
											text={budget.category?.name ?? "—"}
											maxLines={1}
											truncate="END"
											style={{
												fontSize: 12,
												fontWeight: "bold",
												color: (budget.category?.color ??
													"#94a3b8") as `#${string}`,
											}}
										/>
									</FlexWidget>
									<TextWidget
										text={
											budget.isOverBudget
												? t("budgets.overBudget")
												: budget.period === "monthly"
													? t("budgets.monthly")
													: t("budgets.weekly")
										}
										style={{
											fontSize: 10,
											color: budget.isOverBudget ? "#ef4444" : "#52525b",
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
												backgroundColor: budget.isOverBudget
													? "#ef4444"
													: "#3b82f6",
												borderRadius: 2,
											}}
										/>
									)}
									{remaining > 0 && (
										<FlexWidget style={{ flex: remaining, height: 4 }} />
									)}
								</FlexWidget>

								{/* Spent / remaining amounts */}
								<FlexWidget
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
										width: "match_parent",
									}}
								>
									<TextWidget
										text={`${t("budgets.spent")}: ${formatCurrency(budget.spent, budget.currency)}`}
										style={{ fontSize: 10, color: "#71717a" }}
									/>
									<TextWidget
										text={
											budget.isOverBudget
												? t("budgets.overBy", {
														amount: formatCurrency(
															Math.abs(budget.remaining),
															budget.currency,
														),
													})
												: t("budgets.remaining", {
														amount: formatCurrency(
															budget.remaining,
															budget.currency,
														),
													})
										}
										style={{
											fontSize: 10,
											color: budget.isOverBudget ? "#ef4444" : "#71717a",
										}}
									/>
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
						text={t("budgets.widget.tapToRefresh")}
						style={{
							fontSize: 14,
							fontWeight: "bold",
							color: "#fafafa",
						}}
					/>
					<TextWidget
						text={t("budgets.widget.staleMessage")}
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
