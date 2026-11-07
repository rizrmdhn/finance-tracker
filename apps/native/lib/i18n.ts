import { en, id } from "@finance-tracker/dictionaries";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { z } from "zod";
import zodEn from "zod/v4/locales/en.js";
import zodId from "zod/v4/locales/id.js";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: {
			translation: typeof en;
		};
	}
}

// Zod's built-in messages (fields without a custom validation.* key) follow the
// app language. Registered before init so the initial language applies too.
i18n.on("languageChanged", (lng) => {
	z.config(lng === "id" ? zodId() : zodEn());
});

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		id: { translation: id },
	},
	lng: "id",
	fallbackLng: "en",
	interpolation: { escapeValue: false },
});

export default i18n;
