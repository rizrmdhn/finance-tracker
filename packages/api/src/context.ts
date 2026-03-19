import type { AnyDatabase } from "@finance-tracker/db";

export function createContext({ db }: { db: AnyDatabase }) {
	return { db };
}

export type Context = ReturnType<typeof createContext>;
