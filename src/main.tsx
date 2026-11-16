import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { initPWA } from "./pwa";
import { SmartProvider } from "./core/smart/SmartContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SmartProvider>
        <App />
      </SmartProvider>
    </BrowserRouter>
  </StrictMode>,
);

if (import.meta.env.PROD) initPWA();
