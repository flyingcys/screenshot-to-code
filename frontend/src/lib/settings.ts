import { CodeGenerationModelSetting, EditorTheme, Locale, Settings } from "../types";
import { Stack } from "./stacks";
import {
  AUTO_CODE_GENERATION_MODEL,
  CodeGenerationModel,
} from "./models";

const LOCALE_VALUES = new Set<Locale>(["auto", "zh", "en"]);
const STACK_VALUES = new Set<string>(Object.values(Stack));
const CODE_GENERATION_MODEL_VALUES = new Set<string>(
  [AUTO_CODE_GENERATION_MODEL, ...Object.values(CodeGenerationModel)]
);

export function normalizeLocale(value: unknown): Locale {
  if (typeof value === "string" && LOCALE_VALUES.has(value as Locale)) {
    return value as Locale;
  }

  return "auto";
}

function normalizeStack(value: unknown): Stack {
  if (typeof value === "string" && STACK_VALUES.has(value)) {
    return value as Stack;
  }

  return Stack.HTML_TAILWIND;
}

function normalizeCodeGenerationModel(value: unknown): CodeGenerationModelSetting {
  if (
    typeof value === "string" &&
    CODE_GENERATION_MODEL_VALUES.has(value)
  ) {
    return value as CodeGenerationModelSetting;
  }

  return AUTO_CODE_GENERATION_MODEL;
}

export function createDefaultSettings(): Settings {
  return {
    openAiApiKey: null,
    openAiBaseURL: null,
    anthropicApiKey: null,
    geminiApiKey: null,
    screenshotOneApiKey: null,
    isImageGenerationEnabled: true,
    editorTheme: EditorTheme.COBALT,
    generatedCodeConfig: Stack.HTML_TAILWIND,
    codeGenerationModel: AUTO_CODE_GENERATION_MODEL,
    isTermOfServiceAccepted: false,
    locale: "auto",
  };
}

export function mergeSettings(settings: Partial<Settings>): Settings {
  return {
    ...createDefaultSettings(),
    ...settings,
    openAiApiKey: settings.openAiApiKey ?? null,
    openAiBaseURL: settings.openAiBaseURL ?? null,
    anthropicApiKey: settings.anthropicApiKey ?? null,
    geminiApiKey: settings.geminiApiKey ?? null,
    screenshotOneApiKey: settings.screenshotOneApiKey ?? null,
    generatedCodeConfig: normalizeStack(settings.generatedCodeConfig),
    codeGenerationModel: normalizeCodeGenerationModel(
      settings.codeGenerationModel
    ),
    locale: normalizeLocale(settings.locale),
  };
}
