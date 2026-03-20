export const ACCOUNT_TYPES = [
	"cash",
	"bank",
	"e-wallet",
	"credit",
	"savings",
] as const;

export const ACCOUNT_TYPE_LABELS: Record<
	(typeof ACCOUNT_TYPES)[number],
	string
> = {
	cash: "Tunai",
	bank: "Bank",
	"e-wallet": "Dompet Digital",
	credit: "Kredit",
	savings: "Tabungan",
};
