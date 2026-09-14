import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ResellerAuthProvider } from "./auth/ResellerAuthContext";
import "./styles/global.css";

/**
 * `basename` va con la `base` de Vite (`/panel/`). Si se separan, los enlaces
 * internos apuntan a rutas que el servidor entrega al CRM, que es otra
 * aplicación — y el síntoma es una pantalla ajena, no un error.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/panel">
      <ResellerAuthProvider>
        <App />
      </ResellerAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
