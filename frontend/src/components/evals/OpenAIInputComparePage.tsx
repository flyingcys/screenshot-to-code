import { useState } from "react";

import { HTTP_BACKEND_URL } from "../../config";
import EvalNavigation from "./EvalNavigation";
import { useI18n } from "../../lib/i18n";

interface OpenAIInputDifference {
  item_index: number;
  path: string;
  left_summary: string;
  right_summary: string;
  left_value: unknown;
  right_value: unknown;
}

interface OpenAIInputCompareResponse {
  common_prefix_items: number;
  left_item_count: number;
  right_item_count: number;
  difference: OpenAIInputDifference | null;
  formatted: string;
}

function formatJson(value: unknown): string {
  const formatted = JSON.stringify(value, null, 2);
  return formatted ?? String(value);
}

function OpenAIInputComparePage() {
  const { t } = useI18n();
  const [leftJson, setLeftJson] = useState("");
  const [rightJson, setRightJson] = useState("");
  const [result, setResult] = useState<OpenAIInputCompareResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCompare = async () => {
    if (!leftJson.trim() || !rightJson.trim()) {
      setError(t("evals.openAiCompare.pasteBoth"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${HTTP_BACKEND_URL}/openai-input-compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          left_json: leftJson,
          right_json: rightJson,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(data.detail || t("evals.openAiCompare.compareFailed"));
        return;
      }

      setResult(data);
    } catch (requestError) {
      console.error("Error comparing OpenAI inputs", requestError);
      setResult(null);
      setError(t("evals.openAiCompare.compareFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <EvalNavigation />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("evals.openAiCompare.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            {t("evals.openAiCompare.description")}{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100">
              input
            </code>
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {t("evals.openAiCompare.tip")}{" "}
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100">
              {t("evals.openAiCompare.copyInputJson")}
            </span>
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4">
              <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-emerald-100">{t("evals.openAiCompare.leftJson")}</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                {t("evals.openAiCompare.requestA")}
              </span>
            </div>
            <textarea
              value={leftJson}
              onChange={(event) => setLeftJson(event.target.value)}
              placeholder='{"input":[{"role":"system","content":"..."}]}'
              className="min-h-[360px] w-full rounded-xl border border-emerald-900/60 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
              spellCheck={false}
            />
          </section>

          <section className="rounded-2xl border border-sky-900/60 bg-sky-950/30 p-4">
              <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-sky-100">{t("evals.openAiCompare.rightJson")}</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-sky-300/80">
                {t("evals.openAiCompare.requestB")}
              </span>
            </div>
            <textarea
              value={rightJson}
              onChange={(event) => setRightJson(event.target.value)}
              placeholder='{"input":[{"role":"system","content":"..."}]}'
              className="min-h-[360px] w-full rounded-xl border border-sky-900/60 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-sky-500"
              spellCheck={false}
            />
          </section>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleCompare}
            disabled={isLoading}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-500"
          >
            {isLoading ? t("evals.openAiCompare.comparing") : t("evals.openAiCompare.compare")}
          </button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        {result ? (
          <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  {t("evals.openAiCompare.sharedPrefix")}
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {result.common_prefix_items}
                </div>
                <p className="mt-1 text-sm text-zinc-400">{t("evals.openAiCompare.sharedPrefixDesc")}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  {t("evals.openAiCompare.leftItems")}
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {result.left_item_count}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  {t("evals.openAiCompare.rightItems")}
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {result.right_item_count}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold">{t("evals.openAiCompare.firstDifference")}</h2>
              {result.difference ? (
                <div className="mt-4 grid gap-4">
                  <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-amber-300/80">
                      {t("evals.openAiCompare.path")}
                    </div>
                    <div className="mt-2 font-mono text-sm text-amber-50">
                      {result.difference.path}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                        {t("evals.openAiCompare.leftSummary")}
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                        {result.difference.left_summary}
                      </pre>
                      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                        {t("evals.openAiCompare.leftValue")}
                      </div>
                      <pre className="mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                        {formatJson(result.difference.left_value)}
                      </pre>
                    </div>

                    <div className="rounded-xl border border-sky-900/60 bg-sky-950/30 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-sky-300/80">
                        {t("evals.openAiCompare.rightSummary")}
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                        {result.difference.right_summary}
                      </pre>
                      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-sky-300/80">
                        {t("evals.openAiCompare.rightValue")}
                      </div>
                      <pre className="mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
                        {formatJson(result.difference.right_value)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-zinc-300">{t("evals.openAiCompare.noDifference")}</p>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold">{t("evals.openAiCompare.formattedSummary")}</h2>
              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
                {result.formatted}
              </pre>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OpenAIInputComparePage;
