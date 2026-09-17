import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ResellerAuthProvider } from "./auth/ResellerAuthContext";
import "./styles/global.css";

/**
 * El panel vive en la RAÍZ de su propio anfitrión (`partners.cguardpro.com`),
 * así que no lleva prefijo de ruta.
 *
 * `basename` y la `base` de Vite tienen que decir lo mismo. Cuando se separan
 * no sale un error: el enrutador no encuentra ninguna ruta que coincida y pinta
 * NADA. La pantalla queda en negro, el título es el correcto y la consola
 * calla — por eso se comprueba también sobre el paquete construido.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ResellerAuthProvider>
        <App />
      </ResellerAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
