import { accounts } from "../schema";
import type { AnyDatabase } from "../types";

export async function seedDefaultAccounts(db: AnyDatabase) {
	return await db
		.insert(accounts)
		.values([
			{
				id: "seed_acc_cash",
				name: "Cash",
				icon: "Wallet",
				color: "#22c55e",
				type: "cash",
				initialBalance: 0,
				currency: "IDR",
			},
			{
				id: "seed_acc_bank",
				name: "Bank Account",
				icon: "Building",
				color: "#3b82f6",
				type: "bank",
				initialBalance: 0,
				currency: "IDR",
			},
			{
				id: "seed_acc_ewallet",
				name: "E-Wallet",
				icon: "Smartphone",
				color: "#10b981",
				type: "e-wallet",
				initialBalance: 0,
				currency: "IDR",
			},
		])
		.onConflictDoNothing()
		.returning();
}
