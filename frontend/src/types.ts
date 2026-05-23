import { Stack } from "./lib/stacks";
import { AUTO_CODE_GENERATION_MODEL, CodeGenerationModel } from "./lib/models";

export enum EditorTheme {
  ESPRESSO = "espresso",
  COBALT = "cobalt",
}

export enum AppTheme {
  SYSTEM = "system",
  LIGHT = "light",
  DARK = "dark",
}

export type Locale = "auto" | "zh" | "en";
export type CodeGenerationModelSetting =
  | CodeGenerationModel
  | typeof AUTO_CODE_GENERATION_MODEL;

export interface Settings {
  openAiApiKey: string | null;
  openAiBaseURL: string | null;
  screenshotOneApiKey: string | null;
  isImageGenerationEnabled: boolean;
  editorTheme: EditorTheme;
  generatedCodeConfig: Stack;
  codeGenerationModel: CodeGenerationModelSetting;
  selectedDesignSystemId: string | null;
  // Only relevant for hosted version
  isTermOfServiceAccepted: boolean;
  anthropicApiKey: string | null;
  geminiApiKey: string | null;
  locale: Locale;
}

export interface DesignSystem {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export enum AppState {
  INITIAL = "INITIAL",
  CODING = "CODING",
  CODE_READY = "CODE_READY",
}

export enum ScreenRecorderState {
  INITIAL = "initial",
  RECORDING = "recording",
  FINISHED = "finished",
}

export type PromptMessageRole = "user" | "assistant";
export type PromptAssetType = "image" | "video";

export interface PromptAsset {
  id: string;
  type: PromptAssetType;
  dataUrl: string;
}

export interface PromptContent {
  text: string;
  images: string[]; // Array of data URLs
  videos?: string[]; // Array of data URLs
  selectedElementHtml?: string; // Raw HTML of selected element (for display only)
}

export interface PromptHistoryMessage {
  role: PromptMessageRole;
  text: string;
  images: string[];
  videos: string[];
}

export interface CodeGenerationParams {
  generationType: "create" | "update";
  inputMode: "image" | "video" | "text";
  prompt: PromptContent;
  history?: PromptHistoryMessage[];
  fileState?: {
    path: string;
    content: string;
  };
  optionCodes?: string[];
}

export type FullGenerationSettings = CodeGenerationParams &
  Settings & {
    designSystem?: string | null;
  };
