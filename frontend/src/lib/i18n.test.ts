import { detectPreferredLocale, resolveLocale, t } from "./i18n";

describe("i18n helpers", () => {
  test('detectPreferredLocale("zh-CN") === "zh"', () => {
    expect(detectPreferredLocale("zh-CN")).toBe("zh");
  });

  test('detectPreferredLocale("en-US") === "en"', () => {
    expect(detectPreferredLocale("en-US")).toBe("en");
  });

  test("detectPreferredLocale(undefined) === 'en'", () => {
    expect(detectPreferredLocale(undefined)).toBe("en");
  });

  test('detectPreferredLocale("zh_CN") === "zh"', () => {
    expect(detectPreferredLocale("zh_CN")).toBe("zh");
  });

  test('resolveLocale("auto", "zh-TW") === "zh"', () => {
    expect(resolveLocale("auto", "zh-TW")).toBe("zh");
  });

  test('resolveLocale("auto", undefined) === "en"', () => {
    expect(resolveLocale("auto", undefined)).toBe("en");
  });

  test('t("settings.fallbackExample", "zh") falls back to English when Chinese is missing', () => {
    expect(t("settings.fallbackExample", "zh")).toBe("Fallback Example");
  });
});
