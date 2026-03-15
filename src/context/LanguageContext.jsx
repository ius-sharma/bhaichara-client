import { createContext, useContext, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const translations = {
  en: {
    badge: "Student First Platform",
    welcomeTitle: "Welcome to Bhaichara",
    tagline: "Your Friendly Student Support Companion",
    description:
      "Bhaichara helps students feel less alone with supportive conversations, meaningful peer connections, and a safe space to grow together.",
    login: "Login",
    register: "Register",
    toggleLabel: "Switch language",
    toggleButton: "हिंग्लिश",
  },
  hi: {
    badge: "Students ke liye support platform",
    welcomeTitle: "Bhaichara me aapka swagat hai",
    tagline: "Aapka friendly student support companion",
    description:
      "Bhaichara students ko connected aur supported feel karne me help karta hai, jahan friendly baatein, peer connections aur safe space milta hai.",
    login: "Login",
    register: "Register",
    toggleLabel: "Language badlein",
    toggleButton: "English",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("en");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  };

  const t = (key) => translations[language][key] ?? key;

  const value = useMemo(
    () => ({ language, toggleLanguage, t }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
};
