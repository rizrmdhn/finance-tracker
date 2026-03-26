import { en, id } from "@finance-tracker/dictionaries";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: {
			translation: typeof en;
		};
	}
}

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
