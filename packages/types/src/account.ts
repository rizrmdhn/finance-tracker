import type { accounts } from "@finance-tracker/db";

export type Account = typeof accounts.$inferSelect;
export type AccountWithBalance = Account & { balance: number };
