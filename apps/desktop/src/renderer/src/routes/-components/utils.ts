import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";

export function formatCurrency(amount: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(amount);
}

export function formatDate(timestamp: number) {
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
	}).format(new Date(timestamp));
}

export function getCurrentMonthRange() {
	const now = new Date();
	return {
		from: startOfMonth(now).getTime(),
		to: endOfMonth(now).getTime(),
	};
}

export function getSixMonthsRange() {
	const now = new Date();
	return {
		from: startOfMonth(subMonths(now, 5)).getTime(),
		to: endOfMonth(now).getTime(),
	};
}

export function getLast6Months() {
	const now = new Date();
	return Array.from({ length: 6 }, (_, i) => {
		const date = subMonths(now, 5 - i);
		return {
			label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
			from: startOfMonth(date).getTime(),
			to: endOfMonth(date).getTime(),
		};
	});
}

export function getMonthsInRange(from: number, to: number) {
	let current = startOfMonth(new Date(from));
	const end = startOfMonth(new Date(to));
	const result = [];
	while (current <= end) {
		result.push({
			label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(
				current,
			),
			from: startOfMonth(current).getTime(),
			to: endOfMonth(current).getTime(),
		});
		current = addMonths(current, 1);
	}
	return result;
}
