import { APP_SETTINGS_DEFAULTS } from "@finance-tracker/constants";
import { appSettings } from "../schema";
import type { AnyDatabase } from "../types";

export async function seedDefaultAppSettings(db: AnyDatabase) {
	const entries = Object.entries(APP_SETTINGS_DEFAULTS).map(([key, value]) => ({
		key,
		value,
	}));

	return await db
		.insert(appSettings)
		.values(entries)
		.onConflictDoNothing()
		.returning();
}
