import { URLS } from "../../urls";
import { useI18n } from "../../lib/i18n";

function TipLink() {
  const { t } = useI18n();

  return (
    <a
      className="text-xs underline text-gray-500 text-right"
      href={URLS.tips}
      target="_blank"
      rel="noopener"
    >
      {t("common.tips")}
    </a>
  );
}

export default TipLink;
