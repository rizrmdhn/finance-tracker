import type { appSettings } from "@finance-tracker/db";

export type { AppSettingsKey } from "@finance-tracker/constants";
export type AppSettings = typeof appSettings.$inferSelect;
