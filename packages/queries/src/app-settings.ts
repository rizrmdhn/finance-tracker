import { type AnyDatabase, appSettings } from "@finance-tracker/db";
import type { AppSettingsKey } from "@finance-tracker/types";
import { eq } from "drizzle-orm";

export async function getAppSettingByKey(db: AnyDatabase, key: AppSettingsKey) {
	return await db.query.appSettings.findFirst({
		where: eq(appSettings.key, key),
	});
}

export async function setAppSetting(
	db: AnyDatabase,
	key: AppSettingsKey,
	value: string,
) {
	const [result] = await db
		.insert(appSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: appSettings.key, set: { value } })
		.returning();

	if (!result) {
		throw new Error(`Failed to set app setting with key: ${key}`);
	}

	return result;
}
