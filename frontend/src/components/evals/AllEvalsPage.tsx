import { Link } from "react-router-dom";
import { useI18n } from "../../lib/i18n";

function AllEvalsPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{t("evals.home.title")}</h1>
          <Link 
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            {t("evals.navigation.backToApp")}
          </Link>
        </div>
        <div className="space-y-4">
          <Link
            to="/evals/run"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">{t("evals.home.runEvals")}</h2>
            <p className="text-gray-600">{t("evals.home.runEvalsDesc")}</p>
          </Link>

          <Link
            to="/evals/pairwise"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">{t("evals.home.pairwise")}</h2>
            <p className="text-gray-600">{t("evals.home.pairwiseDesc")}</p>
          </Link>

          <Link
            to="/evals/best-of-n"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">{t("evals.home.bestOfN")}</h2>
            <p className="text-gray-600">{t("evals.home.bestOfNDesc")}</p>
          </Link>

          <Link
            to="/evals/single"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">{t("evals.home.single")}</h2>
            <p className="text-gray-600">{t("evals.home.singleDesc")}</p>
          </Link>

          <Link
            to="/evals/openai-input-compare"
            className="block w-full p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">{t("evals.home.inputCompare")}</h2>
            <p className="text-gray-600">{t("evals.home.inputCompareDesc")}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AllEvalsPage;
