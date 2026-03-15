import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
