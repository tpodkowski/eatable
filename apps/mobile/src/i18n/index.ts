import i18n from "i18next";
import { getLocales } from "expo-localization";
import { initReactI18next } from "react-i18next";
import { translations } from "./translations";

const deviceLanguage = getLocales()[0]?.languageCode;
const initialLanguage = deviceLanguage === "pl" ? "pl" : "en";

void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources: {
    pl: { translation: translations.pl },
    en: { translation: translations.en },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
