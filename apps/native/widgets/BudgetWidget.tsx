"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetData } from "../lib/widget-storage";

const BUDGETS_URI = "finance-tracker:///budgets";

const STRINGS = {
	en: {
		title: "Budgets",
		spent: "Spent",
		remaining: "Remaining",
		overBudget: "Over Budget",
		overBy: "Over by",
		monthly: "Monthly",
		weekly: "Weekly",
		noBudgets: "No budgets yet.\nOpen the app to add one.",
	},
	id: {
		title: "Anggaran",
		spent: "Terpakai",
		remaining: "Sisa",
		overBudget: "Melewati Anggaran",
		overBy: "Lebih",
		monthly: "Bulanan",
		weekly: "Mingguan",
		noBudgets: "Belum ada anggaran.\nBuka aplikasi untuk menambah.",
	},
} as const;

const CURRENCY_LOCALE_MAP: Record<string, string> = {
	IDR: "id-ID",
	USD: "en-US",
};

function fmt(amount: number, currency: string, locale: string) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(amount);
}

type Props = { data: WidgetData | null };

export function BudgetWidget({ data }: Props) {
	const lang = (data?.language ?? "id") as keyof typeof STRINGS;
	const t = STRINGS[lang] ?? STRINGS.id;
	const currency = data?.currency ?? "IDR";
	const locale =
		data?.currencyLocale ?? CURRENCY_LOCALE_MAP[currency] ?? "id-ID";
	const budgets = data?.budgets ?? [];

	return (
		<FlexWidget
			clickAction="OPEN_URI"
			clickActionData={{ uri: BUDGETS_URI }}
			style={{
				flexDirection: "column",
				backgroundColor: "#09090b",
				borderRadius: 16,
				padding: 16,
				width: "match_parent",
				height: "match_parent",
			}}
		>
			{/* Header */}
			<TextWidget
				text={t.title}
				style={{
					fontSize: 15,
					fontWeight: "bold",
					color: "#fafafa",
					marginBottom: 10,
				}}
			/>

			{budgets.length === 0 ? (
				<TextWidget
					text={t.noBudgets}
					style={{ fontSize: 12, color: "#71717a", textAlign: "center" }}
				/>
			) : (
				budgets.slice(0, 4).map((budget) => {
					const percent =
						budget.amount > 0 ? Math.min(budget.spent / budget.amount, 1) : 0;
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
											? t.overBudget
											: budget.period === "monthly"
												? t.monthly
												: t.weekly
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
									text={`${t.spent}: ${fmt(budget.spent, currency, locale)}`}
									style={{ fontSize: 10, color: "#71717a" }}
								/>
								<TextWidget
									text={
										budget.isOverBudget
											? `${t.overBy} ${fmt(Math.abs(budget.remaining), currency, locale)}`
											: `${t.remaining}: ${fmt(budget.remaining, currency, locale)}`
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
	);
}
