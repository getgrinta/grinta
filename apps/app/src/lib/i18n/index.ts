import { browser } from '$app/environment';
import { init, register, locale, dictionary, _ } from 'svelte-i18n';

// Register locales
const locales = {
  en: () => import('./locales/en.json'),
  pl: () => import('./locales/pl.json'),
  de: () => import('./locales/de.json'),
};

// Initialize i18n
export function setupI18n() {
  // Register all locales
  Object.entries(locales).forEach(([locale, loader]) => {
    register(locale, loader);
  });

  // Initialize with browser language or default to English
  init({
    fallbackLocale: 'en',
    initialLocale: browser ? window.navigator.language.split('-')[0] : 'en',
  });
}

// Export for convenience
export { _, locale, dictionary };
