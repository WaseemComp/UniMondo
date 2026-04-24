import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "ar", "de", "fr"] as const;
export type AppLocale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locales.includes(locale as AppLocale) ? (locale as AppLocale) : "en";
  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});

