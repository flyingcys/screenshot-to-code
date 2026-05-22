import { Link } from "react-router-dom";
import { useI18n } from "../../lib/i18n";

function EvalNavigation() {
  const { t } = useI18n();

  return (
    <div className="flex justify-between items-center w-full py-3 px-4 bg-zinc-900 text-white">
      <div className="flex items-center space-x-4">
        <Link
          to="/evals"
          className="font-medium hover:text-blue-300 transition-colors"
        >
          {t("evals.navigation.home")}
        </Link>
        
        <div className="text-gray-500">|</div>
        
        <Link
          to="/evals/run"
          className="hover:text-blue-300 transition-colors"
        >
          {t("evals.navigation.run")}
        </Link>
        
        <Link
          to="/evals/pairwise"
          className="hover:text-blue-300 transition-colors"
        >
          {t("evals.navigation.pairwise")}
        </Link>
        
        <Link
          to="/evals/best-of-n"
          className="hover:text-blue-300 transition-colors"
        >
          {t("evals.navigation.bestOfN")}
        </Link>
        
        <Link
          to="/evals/single"
          className="hover:text-blue-300 transition-colors"
        >
          {t("evals.navigation.single")}
        </Link>

        <Link
          to="/evals/openai-input-compare"
          className="hover:text-blue-300 transition-colors"
        >
          {t("evals.navigation.inputCompare")}
        </Link>
      </div>
      
      <Link
        to="/"
        className="text-sm text-gray-300 hover:text-white transition-colors"
      >
        {t("evals.navigation.backToApp")}
      </Link>
    </div>
  );
}

export default EvalNavigation;
