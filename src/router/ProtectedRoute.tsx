import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import { Boton } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * La puerta de las rutas del panel.
 *
 * ── SIN PASARELAS ENTRE CANALES ───────────────────────────────────────────
 * Una sesión de CRM, de vigilante, de supervisor o de cliente NO entra aquí, y
 * no se intenta convertirla en nada: no se reutiliza esa identidad, no se
 * pregunta si esa persona «además» es socio y no se pide un token nuevo por su
 * cuenta. Se le dice qué pasa y se le manda a entrar como socio. Cualquier
 * atajo aquí desharía la separación de canales que sostiene el backend.
 */
export function ProtectedRoute({
  children,
  /** El asistente de alta se pinta sin barra lateral: durante el alta todavía
   *  no hay nada a lo que navegar, y enseñar un menú de secciones que aún no
   *  existen sólo invita a salirse del asistente a medias. */
  sinArmazon,
}: { children: ReactNode; sinArmazon?: boolean }) {
  const { cargando, autenticado, motivo, mensaje, recargar, salir } = useResellerAuth();
  const location = useLocation();
  const t = useT();

  // Mientras se valida la sesión guardada no se enseña ni el armazón: pintar
  // media pantalla y quitarla después es peor que esperar un momento.
  if (cargando) {
    return (
      <AuthLayout>
        <div role="status" aria-live="polite" style={{ textAlign: "center" }}>
          {t("sesion.comprobando")}
        </div>
      </AuthLayout>
    );
  }

  if (!autenticado) {
    // La capa apagada no es un problema de credenciales: mandarlo a la pantalla
    // de entrada le haría teclear su contraseña para nada.
    if (motivo === "capa-apagada" || motivo === "error") {
      return (
        <AuthLayout>
          <div role="alert" style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 18, marginBottom: "var(--s-2)" }}>{t("sesion.noDisponible")}</h1>
            <p style={{ fontSize: 13, color: "var(--ink-subtle)" }}>{mensaje}</p>
            {/* A passing 500 on startup used to leave this screen with no exit. */}
            <div style={{ display: "flex", gap: "var(--s-3)", justifyContent: "center", marginTop: "var(--s-4)" }}>
              <Boton onClick={() => { void recargar(); }}>{t("comun.reintentar")}</Boton>
              <Boton variante="fantasma" onClick={salir}>{t("sesion.volverAEntrar")}</Boton>
            </div>
          </div>
        </AuthLayout>
      );
    }
    return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  }

  if (sinArmazon) return <>{children}</>;
  return <AppLayout>{children}</AppLayout>;
}

export default ProtectedRoute;
