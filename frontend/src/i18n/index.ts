import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import enData from "@/locales/en/data.json";
import viCommon from "@/locales/vi/common.json";
import viData from "@/locales/vi/data.json";

function syncDocument() {
  const lng = i18n.resolvedLanguage ?? i18n.language ?? "en";
  document.documentElement.lang = lng.startsWith("vi") ? "vi" : "en";
  document.title = i18n.t("common:document.title");
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, data: enData },
      vi: { common: viCommon, data: viData },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "vi"],
    nonExplicitSupportedLngs: true,
    defaultNS: "common",
    ns: ["common", "data"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  })
  .then(() => {
    syncDocument();
  });

i18n.on("languageChanged", syncDocument);

export default i18n;
