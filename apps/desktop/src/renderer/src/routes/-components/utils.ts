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
