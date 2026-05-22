# 全局 UI 中英切换实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在前端加入一个可持久化的全局语言切换，支持中文与英文，默认根据系统语言自动选择中文或英文，并让主要可见 UI 文案全部跟随该选择。

**架构：** 采用轻量自建 i18n，不引入第三方国际化库。语言状态作为 `Settings` 的一部分持久化到本地存储，应用启动时先根据浏览器语言解析默认值，再由设置页覆盖。`i18n` 模块负责语言解析、翻译查找和 React 读取入口，页面组件只消费统一的 `t()` / `useI18n()`，缺失项回退英文，避免界面空白或运行时错误。

**技术栈：** React 18、TypeScript、Vite、Zustand、本地持久化状态、Jest、ESLint。

---

### Task 1: 建立语言模型与翻译基础设施

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/lib/i18n.ts`
- Create: `frontend/src/lib/i18n-strings.ts`
- Create: `frontend/src/lib/i18n.test.ts`

- [ ] **Step 1: 写失败测试，覆盖系统语言默认值和英文回退**

```ts
import { detectPreferredLocale, resolveLocale, t } from "./i18n";

describe("detectPreferredLocale", () => {
  it("returns zh when browser language is Chinese", () => {
    expect(detectPreferredLocale("zh-CN")).toBe("zh");
  });

  it("returns en when browser language is not Chinese", () => {
    expect(detectPreferredLocale("en-US")).toBe("en");
  });
});

describe("t", () => {
  it("falls back to English when a zh translation is missing", () => {
    expect(t("settings.title", "zh")).toBe("Settings");
  });
});

describe("resolveLocale", () => {
  it("uses zh for Chinese browser locale when set to auto", () => {
    expect(resolveLocale("auto", "zh-TW")).toBe("zh");
  });
});
```

- [ ] **Step 2: 运行单测确认当前失败**

Run: `cd frontend && pnpm exec jest src/lib/i18n.test.ts --runInBand`

Expected: `detectPreferredLocale`, `t` 未实现或断言失败。

- [ ] **Step 3: 实现最小语言基础设施**

```ts
export type Locale = "auto" | "zh" | "en";
export type ResolvedLocale = "zh" | "en";

export function detectPreferredLocale(language: string | undefined): ResolvedLocale {
  if (!language) return "en";
  return language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function resolveLocale(locale: Locale, browserLanguage: string | undefined): ResolvedLocale {
  if (locale === "auto") return detectPreferredLocale(browserLanguage);
  return locale;
}
```

`frontend/src/lib/i18n-strings.ts` 需要导出中英文字典，先覆盖设置页、侧边栏、启动页、常用按钮、空状态与提示语：

```ts
export const STRINGS = {
  en: {
    settings: { title: "Settings" },
  },
  zh: {
    settings: { title: "设置" },
  },
} as const;
```

- [ ] **Step 4: 运行单测确认通过**

Run: `cd frontend && pnpm exec jest src/lib/i18n.test.ts --runInBand`

Expected: 默认语言解析和回退逻辑通过。

- [ ] **Step 5: 提交该基础层改动**

```bash
git add frontend/src/types.ts frontend/src/lib/i18n.ts frontend/src/lib/i18n-strings.ts frontend/src/lib/i18n.test.ts
git commit -m "feat: add locale foundation"
```

### Task 2: 把语言设置接入全局状态和设置页

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/lib/settings.ts`
- Modify: `frontend/src/components/settings/SettingsTab.tsx`

- [ ] **Step 1: 写失败测试，确认 settings 新增字段会被持久化并显示**

```ts
import { createDefaultSettings } from "../lib/settings";

describe("createDefaultSettings", () => {
  it("sets locale to auto by default", () => {
    expect(createDefaultSettings().locale).toBe("auto");
  });
});
```

- [ ] **Step 2: 运行相关测试，确认当前缺字段**

Run: `cd frontend && pnpm exec jest src/lib/i18n.test.ts --runInBand`

Expected: `Settings` 还没有 `locale` 字段或设置页没有对应控件。

- [ ] **Step 3: 实现 settings 字段与自动默认值**

在 `Settings` 中新增：

```ts
export interface Settings {
  // ...
  locale: Locale;
}
```

在 `App.tsx` 初始化默认值时加入：

```ts
locale: "auto",
```

并在启动后通过浏览器语言解析实际展示语言，但不覆盖用户显式选择。

- [ ] **Step 4: 在设置页增加语言切换控件**

在 `SettingsTab.tsx` 新增一个独立卡片或 `Theme` 分组内一行：

```tsx
const { t } = useI18n();

<Select
  name="ui-language"
  value={settings.locale}
  onValueChange={(value) =>
    setSettings((s) => ({ ...s, locale: value as Locale }))
  }
>
  <SelectTrigger className="w-[160px]">{t("settings.language.followSystem")}</SelectTrigger>
  <SelectContent>
    <SelectItem value="auto">{t("settings.language.followSystem")}</SelectItem>
    <SelectItem value="zh">中文</SelectItem>
    <SelectItem value="en">English</SelectItem>
  </SelectContent>
</Select>
```

说明文案也要走翻译，不能再硬编码英文。

- [ ] **Step 5: 运行前端测试和 lint**

Run:

```bash
cd frontend && pnpm exec jest src/lib/i18n.test.ts --runInBand
cd frontend && pnpm lint
```

Expected: 无新增 lint 警告，设置页编译通过。

- [ ] **Step 6: 提交该状态接入改动**

```bash
git add frontend/src/types.ts frontend/src/App.tsx frontend/src/components/settings/SettingsTab.tsx
git commit -m "feat: add ui language setting"
```

### Task 3: 扫描并替换全站可见文案

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/sidebar/IconStrip.tsx`
- Modify: `frontend/src/components/sidebar/Sidebar.tsx`
- Modify: `frontend/src/components/start-pane/StartPane.tsx`
- Modify: `frontend/src/components/messages/OnboardingNote.tsx`
- Modify: `frontend/src/components/messages/PicoBadge.tsx`
- Modify: `frontend/src/components/messages/TipLink.tsx`
- Modify: `frontend/src/components/settings/SettingsTab.tsx`
- Modify: `frontend/src/components/settings/GenerationSettings.tsx`
- Modify: `frontend/src/components/settings/OutputSettingsSection.tsx`
- Modify: `frontend/src/components/unified-input/UnifiedInputPane.tsx`
- Modify: `frontend/src/components/unified-input/tabs/*.tsx`
- Modify: `frontend/src/components/preview/*.tsx`
- Modify: `frontend/src/components/TermsOfServiceDialog.tsx`
- Modify: `frontend/src/components/ImportCodeSection.tsx`
- Modify: `frontend/src/components/ImageUpload.tsx`
- Modify: `frontend/src/components/recording/ScreenRecorder.tsx`
- Modify: `frontend/src/components/variants/Variants.tsx`

- [ ] **Step 1: 先做一次文案盘点，确认所有用户可见字符串的覆盖范围**

运行：

```bash
rg -n '"[^"]+"' frontend/src/App.tsx frontend/src/components frontend/src/lib
```

把结果按“设置页 / 首页 / 侧边栏 / 预览 / 弹窗 / 提示语 / 按钮”分组，补进翻译表。

- [ ] **Step 2: 用 `t()` 替换 UI 字符串**

示例：

```tsx
<h1>{t("settings.title")}</h1>
<button>{t("common.save")}</button>
<p>{t("sidebar.selectModeHint")}</p>
```

只翻译文案，不翻译代码标识、模型名、stack 名称、API key 名称和错误代码。

- [ ] **Step 3: 为缺失翻译补英文回退**

所有新增文案都必须同时出现在 `en` 和 `zh` 两个分支；如果某条 `zh` 暂时缺失，`t()` 必须回退到英文，避免 UI 崩溃。

- [ ] **Step 4: 运行前端验证**

Run:

```bash
cd frontend && pnpm lint
cd frontend && pnpm test
```

Expected: lint 通过，关键 UI 组件的现有测试不回归。

- [ ] **Step 5: 提交全站文案替换**

```bash
git add frontend/src/App.tsx frontend/src/components frontend/src/lib/i18n-strings.ts
git commit -m "feat: translate ui strings"
```

### Task 4: 端到端验收和回归修正

**Files:**
- Modify: `frontend/src/lib/i18n.test.ts`
- Modify: `frontend/src/components/settings/SettingsTab.tsx`
- Modify: `frontend/src/lib/i18n.ts`

- [ ] **Step 1: 增加浏览器语言自动选择的覆盖测试**

```ts
describe("resolveLocale", () => {
  it("uses zh for Chinese browser locale when set to auto", () => {
    expect(resolveLocale("auto", "zh-TW")).toBe("zh");
  });

  it("uses en for non-Chinese browser locale when set to auto", () => {
    expect(resolveLocale("auto", "fr-FR")).toBe("en");
  });
});
```

- [ ] **Step 2: 手工验证中文与英文两种界面**

分别在浏览器语言为中文和英文的环境下启动前端，确认：

```text
设置页标题、语言下拉、侧边栏、首页按钮、提示文本、弹窗文案都按语言切换
```

- [ ] **Step 3: 跑项目要求的验证命令**

Run:

```bash
cd frontend && pnpm lint
cd backend && poetry run pytest
cd backend && poetry run pyright
```

Expected: 前端 lint 通过；后端测试和类型检查无新增失败或 warning。

- [ ] **Step 4: 清理最后一轮文案遗漏**

如果验收时发现仍有硬编码英文或中文，回到 Task 3 补齐字典并重新验证，不接受只改单个页面的残留状态。

- [ ] **Step 5: 最终提交**

```bash
git add .
git commit -m "feat: add bilingual ui toggle"
```
