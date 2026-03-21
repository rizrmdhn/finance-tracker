export const APP_SETTINGS_KEYS = [
	"currency",
	"language",
	"onboarding",
] as const;

export type AppSettingsKey = (typeof APP_SETTINGS_KEYS)[number];

export const APP_SETTINGS_LABELS: Record<AppSettingsKey, string> = {
	currency: "Currency",
	language: "Language",
	onboarding: "Onboarding",
};

export const APP_SETTINGS_DEFAULTS: Record<AppSettingsKey, string> = {
	currency: "IDR",
	language: "id",
	onboarding: "pending",
};

export const SUPPORTED_LANGUAGES = ["id", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
	id: "Bahasa Indonesia",
	en: "English",
};
