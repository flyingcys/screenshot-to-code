import { AUTO_CODE_GENERATION_MODEL, CodeGenerationModel } from "./models";
import { Stack } from "./stacks";
import { createDefaultSettings, mergeSettings } from "./settings";

describe("settings defaults", () => {
  test("createDefaultSettings sets locale to auto", () => {
    expect(createDefaultSettings().locale).toBe("auto");
    expect(createDefaultSettings().codeGenerationModel).toBe(
      AUTO_CODE_GENERATION_MODEL
    );
  });

  test("mergeSettings fills missing locale and generated code config", () => {
    const merged = mergeSettings({ openAiApiKey: "sk-test" });

    expect(merged.locale).toBe("auto");
    expect(merged.generatedCodeConfig).toBe(Stack.HTML_TAILWIND);
    expect(merged.openAiApiKey).toBe("sk-test");
  });


  test("mergeSettings falls back when stored model is unsupported", () => {
    const merged = mergeSettings({
      codeGenerationModel: "unsupported-model" as CodeGenerationModel,
    });

    expect(merged.codeGenerationModel).toBe(AUTO_CODE_GENERATION_MODEL);
  });

  test("mergeSettings keeps explicit supported model selection", () => {
    const merged = mergeSettings({
      codeGenerationModel: CodeGenerationModel.GPT_5_4_2026_03_05_LOW,
    });

    expect(merged.codeGenerationModel).toBe(
      CodeGenerationModel.GPT_5_4_2026_03_05_LOW
    );
  });
});
