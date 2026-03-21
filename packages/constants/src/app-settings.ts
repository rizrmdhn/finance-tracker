export const APP_SETTINGS_KEYS = ["currency", "theme", "language"] as const;

export type AppSettingsKey = (typeof APP_SETTINGS_KEYS)[number];

export const APP_SETTINGS_LABELS: Record<AppSettingsKey, string> = {
	currency: "Currency",
	theme: "Theme",
	language: "Language",
};

export const APP_SETTINGS_DEFAULTS: Record<AppSettingsKey, string> = {
	currency: "IDR",
	theme: "light",
	language: "id",
};
