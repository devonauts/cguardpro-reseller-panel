import { useEffect, useRef, useState } from "react";

import { limpiarMarca } from "@/branding/marcaDelSocio";
import { desconectarTiempoReal } from "@/lib/tiempoReal";
import { guardarSesionDeSoporte } from "@/lib/sesionDeSoporte";
import { post, setAuthToken } from "@/services/api";
import { useT } from "@/i18n/IdiomaProvider";

interface Canje {
  token: string;
  resellerId: string;
  resellerName: string;
  userName: string;
  ticketId: string | null;
  ticketAsunto: string | null;
  expiresAt: string;
}

/**
 * `/acceso-soporte?pase=…` — donde aterriza «Entrar al panel del socio» del
 * SuperAdmin. Canjea el pase de un solo uso por una sesión de 30 minutos,
 * sustituye la que hubiera en este navegador y entra al panel con una carga
 * completa, para que todo arranque con la identidad nueva.
 *
 * Fuera de `ProtectedRoute` por fuerza: quien llega todavía no tiene sesión
 * en este origen. El pase no se queda en la barra ni en el historial.
 */
export default function AccesoSoporte() {
  const t = useT();
  const [error, setError] = useState(false);
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    const pase = new URLSearchParams(window.location.search).get("pase") || "";
    window.history.replaceState(null, "", "/acceso-soporte");

    (async () => {
      try {
        const s = await post<Canje>("/auth/reseller-support-pass", { pase });
        if (!s?.token) throw new Error("token-missing");
        desconectarTiempoReal();
        limpiarMarca();
        setAuthToken(s.token);
        guardarSesionDeSoporte({
          resellerName: s.resellerName || "",
          userName: s.userName || "",
          ticketAsunto: s.ticketAsunto || null,
          expiresAt: s.expiresAt,
        });
        window.location.replace("/dashboard");
      } catch {
        setError(true);
      }
    })();
  }, []);

  return (
    <div role="status" aria-live="polite" style={{ textAlign: "center" }}>
      <h1 style={{ fontSize: 18, marginBottom: "var(--s-2)" }}>
        {error ? t("soporteVivo.vencioTitulo") : t("soporteVivo.entrando")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-subtle)" }}>
        {error ? t("soporteVivo.vencioTexto") : t("soporteVivo.espera")}
      </p>
    </div>
  );
}
