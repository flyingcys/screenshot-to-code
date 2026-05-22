import { Commit, CommitType } from "../commits/types";
import { t, TranslationLocale } from "../../lib/i18n";

function displayHistoryItemType(itemType: CommitType, locale: TranslationLocale) {
  switch (itemType) {
    case "ai_create":
      return t("history.create", locale);
    case "ai_edit":
      return t("history.edit", locale);
    case "code_create":
      return t("history.importedFromCode", locale);
    default: {
      const exhaustiveCheck: never = itemType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}

const setParentVersion = (commit: Commit, history: Commit[]) => {
  if (!commit.parentHash) return null;

  const parentIndex = history.findIndex(
    (item) => item.hash === commit.parentHash
  );
  const currentIndex = history.findIndex((item) => item.hash === commit.hash);

  return parentIndex !== -1 && parentIndex != currentIndex - 1
    ? parentIndex + 1
    : null;
};

function extractTagName(html: string): string {
  const match = html.match(/^<(\w+)/);
  return match ? match[1].toLowerCase() : "element";
}

function getCommitMedia(commit: Commit): { images: string[]; videos: string[] } {
  if (commit.type === "code_create") {
    return { images: [], videos: [] };
  }
  return {
    images: commit.inputs.images || [],
    videos: commit.inputs.videos || [],
  };
}

export function summarizeHistoryItem(
  commit: Commit,
  locale: TranslationLocale
): string {
  const commitType = commit.type;
  switch (commitType) {
    case "ai_create":
      return t("history.create", locale);
    case "ai_edit":
      return commit.inputs.text || t("history.edit", locale);
    case "code_create":
      return t("history.importedFromCode", locale);
    default: {
      const exhaustiveCheck: never = commitType;
      throw new Error(`Unhandled case: ${exhaustiveCheck}`);
    }
  }
}

export function getSelectedElementTag(commit: Commit): string | null {
  if (commit.type === "code_create") return null;
  const html = commit.inputs.selectedElementHtml;
  if (!html) return null;
  return extractTagName(html);
}

export type RenderedHistoryItem = Omit<Commit, "type"> & {
  type: string;
  summary: string;
  selectedElementTag: string | null;
  parentVersion: number | null;
  images: string[];
  videos: string[];
};

export const renderHistory = (
  history: Commit[],
  locale: TranslationLocale
): RenderedHistoryItem[] => {
  const renderedHistory: RenderedHistoryItem[] = [];

  for (let i = 0; i < history.length; i++) {
    const commit = history[i];
    const media = getCommitMedia(commit);
    renderedHistory.push({
      ...commit,
      type: displayHistoryItemType(commit.type, locale),
      summary: summarizeHistoryItem(commit, locale),
      selectedElementTag: getSelectedElementTag(commit),
      parentVersion: setParentVersion(commit, history),
      images: media.images,
      videos: media.videos,
    });
  }

  return renderedHistory;
};
