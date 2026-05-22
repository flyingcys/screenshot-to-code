import React from "react";
import {
  AppTheme,
  CodeGenerationModelSetting,
  EditorTheme,
  Locale,
  Settings,
} from "../../types";
import { capitalize } from "../../lib/utils";
import {
  CODE_GENERATION_MODEL_DESCRIPTIONS,
  CODE_GENERATION_MODEL_OPTIONS,
  AUTO_CODE_GENERATION_MODEL,
  CodeGenerationModel,
} from "../../lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { IS_RUNNING_ON_CLOUD } from "../../config";
import { normalizeLocale } from "../../lib/settings";
import { useI18n } from "../../lib/i18n";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  appTheme: AppTheme;
  setAppTheme: React.Dispatch<React.SetStateAction<AppTheme>>;
}

function SettingsTab({ settings, setSettings, appTheme, setAppTheme }: Props) {
  const { t } = useI18n();

  const handleThemeChange = (theme: EditorTheme) => {
    setSettings((s) => ({
      ...s,
      editorTheme: theme,
    }));
  };

  const handleLocaleChange = (locale: Locale) => {
    setSettings((s) => ({
      ...s,
      locale: normalizeLocale(locale),
    }));
  };

  const handleModelChange = (model: CodeGenerationModelSetting) => {
    setSettings((s) => ({
      ...s,
      codeGenerationModel: model,
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("settings.title")}
          </h1>
        </div>

        <div className="mx-auto max-w-lg space-y-6">
          {/* Theme */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.theme")}
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-700">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    {t("settings.appTheme")}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    {t("settings.appThemeHelp")}
                  </p>
                </div>
                <Select
                  name="app-theme"
                  value={appTheme}
                  onValueChange={(value) => setAppTheme(value as AppTheme)}
                >
                  <SelectTrigger className="w-[140px]">
                    {appTheme === AppTheme.SYSTEM
                      ? t("settings.followSystem")
                      : appTheme === AppTheme.LIGHT
                        ? t("settings.light")
                        : t("settings.dark")}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AppTheme.SYSTEM}>{t("settings.followSystem")}</SelectItem>
                    <SelectItem value={AppTheme.LIGHT}>{t("settings.light")}</SelectItem>
                    <SelectItem value={AppTheme.DARK}>{t("settings.dark")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    {t("settings.codeEditorTheme")}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    {t("settings.codeEditorThemeHelp")}
                  </p>
                </div>
                <Select
                  name="editor-theme"
                  value={settings.editorTheme}
                  onValueChange={(value) =>
                    handleThemeChange(value as EditorTheme)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <span className="notranslate" translate="no">
                      {capitalize(settings.editorTheme)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobalt">
                      <span className="notranslate" translate="no">Cobalt</span>
                    </SelectItem>
                    <SelectItem value="espresso">
                      <span className="notranslate" translate="no">Espresso</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    {t("settings.uiLanguage")}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    {t("settings.uiLanguageHelp")}
                  </p>
                </div>
                <Select
                  name="ui-language"
                  value={settings.locale}
                  onValueChange={handleLocaleChange}
                >
                  <SelectTrigger className="w-[160px]">
                    {settings.locale === "auto"
                      ? t("settings.followSystem")
                      : settings.locale === "zh"
                        ? t("settings.chinese")
                        : t("settings.english")}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("settings.followSystem")}</SelectItem>
                    <SelectItem value="zh">{t("settings.chinese")}</SelectItem>
                    <SelectItem value="en">{t("settings.english")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.apiKeys")}
              </h2>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {t("settings.openAiApiKey")}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {t("settings.openAiApiKeyHelp")}
                </p>
                <Input
                  id="openai-api-key"
                  className="mt-2"
                  placeholder={t("settings.openAiApiKey")}
                  value={settings.openAiApiKey || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      openAiApiKey: e.target.value,
                    }))
                  }
                />
              </div>

              {!IS_RUNNING_ON_CLOUD && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    {t("settings.openAiBaseUrl")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    {t("settings.openAiBaseUrlHelp")}
                  </p>
                  <Input
                    id="openai-base-url"
                    className="mt-2"
                    placeholder={t("settings.openAiBaseUrl")}
                    value={settings.openAiBaseURL || ""}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        openAiBaseURL: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {t("settings.anthropicApiKey")}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {t("settings.anthropicApiKeyHelp")}
                </p>
                <Input
                  id="anthropic-api-key"
                  className="mt-2"
                  placeholder={t("settings.anthropicApiKey")}
                  value={settings.anthropicApiKey || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      anthropicApiKey: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {t("settings.geminiApiKey")}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {t("settings.geminiApiKeyHelp")}
                </p>
                <Input
                  id="gemini-api-key"
                  className="mt-2"
                  placeholder={t("settings.geminiApiKey")}
                  value={settings.geminiApiKey || ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      geminiApiKey: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Code Generation */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.codeGeneration")}
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    {t("settings.codeGenerationModel")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    {t("settings.codeGenerationModelHelp")}
                  </p>
                </div>
                <Select
                  name="code-generation-model"
                  value={settings.codeGenerationModel}
                  onValueChange={(value) =>
                    handleModelChange(value as CodeGenerationModelSetting)
                  }
                >
                  <SelectTrigger className="w-[260px]">
                    {settings.codeGenerationModel === AUTO_CODE_GENERATION_MODEL
                      ? t("settings.autoSelectModel")
                      : CODE_GENERATION_MODEL_DESCRIPTIONS[
                          settings.codeGenerationModel as CodeGenerationModel
                        ]?.name ?? settings.codeGenerationModel}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_CODE_GENERATION_MODEL}>
                      {t("settings.autoSelectModel")}
                    </SelectItem>
                    {CODE_GENERATION_MODEL_OPTIONS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.name}
                        {model.inBeta ? ` (${t("common.beta")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Image Generation */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.imageGeneration")}
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-zinc-300">
                    {t("settings.placeholderImages")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    {t("settings.placeholderImagesHelp")}
                  </p>
                </div>
                <Switch
                  id="image-generation"
                  checked={settings.isImageGenerationEnabled}
                  onCheckedChange={() =>
                    setSettings((s) => ({
                      ...s,
                      isImageGenerationEnabled: !s.isImageGenerationEnabled,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Screenshot by URL */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("settings.screenshotByUrl")}
              </h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {t("settings.screenshotByUrlHelp")}{" "}
                <a
                  href="https://screenshotone.com?via=screenshot-to-code"
                  className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  target="_blank"
                >
                  {t("settings.screenshotOneCta")}
                </a>
              </p>
              <Input
                id="screenshot-one-api-key"
                className="mt-3"
                placeholder={t("settings.screenshotOneApiKey")}
                value={settings.screenshotOneApiKey || ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    screenshotOneApiKey: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
