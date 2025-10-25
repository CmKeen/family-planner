import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import frTranslation from '../locales/fr.json';
import enTranslation from '../locales/en.json';
import nlTranslation from '../locales/nl.json';

const resources = {
  fr: {
    translation: frTranslation
  },
  en: {
    translation: enTranslation
  },
  nl: {
    translation: nlTranslation
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    fallbackLng: 'fr', // Default language
    supportedLngs: ['fr', 'en', 'nl'],
    lng: 'fr', // Set initial language explicitly

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React already escapes
    },

    react: {
      useSuspense: false
    },

    debug: true // Enable debug mode to see what's happening
  });

export default i18n;
