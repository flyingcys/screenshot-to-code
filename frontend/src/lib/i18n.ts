import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import { Locale } from "../types";
import { i18nStrings, TranslationLocale } from "./i18n-strings";
export type { TranslationLocale } from "./i18n-strings";

type TranslationLeafKey<T> = T extends string
  ? never
  : {
      [K in Extract<keyof T, string>]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? `${K}.${TranslationLeafKey<T[K]>}`
          : never;
    }[Extract<keyof T, string>];

export type TranslationKey = TranslationLeafKey<typeof i18nStrings.en>;

export interface I18nContextValue {
  locale: Exclude<Locale, "auto">;
  t: (keyPath: TranslationKey) => string;
}

const defaultI18nContext: I18nContextValue = {
  locale: "en",
  t: (keyPath: TranslationKey) => t(keyPath, "en"),
};

const I18nContext = createContext<I18nContextValue>(defaultI18nContext);

function normalizeLanguageTag(languageTag: string): string {
  return languageTag.trim().toLowerCase().replace(/_/g, "-");
}

export function detectPreferredLocale(
  languageTag?: string
): Exclude<Locale, "auto"> {
  if (!languageTag) {
    return "en";
  }

  const normalized = normalizeLanguageTag(languageTag);

  if (normalized.startsWith("zh")) {
    return "zh";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return "en";
}

export function resolveLocale(locale: Locale, browserLanguage?: string): Exclude<Locale, "auto"> {
  if (locale !== "auto") {
    return locale;
  }

  if (browserLanguage) {
    return detectPreferredLocale(browserLanguage);
  }

  return "en";
}

function getTranslationValue(
  locale: TranslationLocale,
  keyPath: TranslationKey
): string | undefined {
  const segments = keyPath.split(".");
  let current: unknown = i18nStrings[locale];

  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function t(keyPath: TranslationKey, locale: Exclude<Locale, "auto">): string {
  return getTranslationValue(locale, keyPath) ?? getTranslationValue("en", keyPath) ?? keyPath;
}

export function I18nProvider({
  locale,
  children,
}: {
  locale: Exclude<Locale, "auto">;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (keyPath) => t(keyPath, locale),
    }),
    [locale]
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
