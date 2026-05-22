import { useI18n } from "../../lib/i18n";

export function OnboardingNote() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col space-y-4 bg-green-700 p-2 rounded text-stone-200 text-sm">
      <span>
        {t("onboarding.intro")}{" "}
        <a
          className="inline underline hover:opacity-70"
          href="https://buy.stripe.com/8wM6sre70gBW1nqaEE"
          target="_blank"
        >
          {t("onboarding.buyCredits")}
        </a>{" "}
        {t("onboarding.orUseOwnKey")}{" "}
        <a
          href="https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md"
          className="inline underline hover:opacity-70"
          target="_blank"
        >
          {t("onboarding.getKeyInstructions")}
        </a>{" "}
        {t("onboarding.settingsDialog")} {t("onboarding.storedInBrowser")}
      </span>
    </div>
  );
}
