import { useLanguage } from "../context/LanguageContext";

const LanguageToggle = () => {
  const { toggleLanguage, t } = useLanguage();

  return (
    <button
      type="button"
      className="home-language-toggle"
      onClick={toggleLanguage}
      aria-label={t("toggleLabel")}
    >
      {t("toggleButton")}
    </button>
  );
};

export default LanguageToggle;
