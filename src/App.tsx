import { Navigate, Route, Routes } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import ProtectedRoute from "@/router/ProtectedRoute";
import Contrato from "@/pages/Contrato";
import Derechos from "@/pages/Derechos";
import Dominios from "@/pages/Dominios";
import Actividad from "@/pages/Actividad";
import Analitica from "@/pages/Analitica";
import Cuenta from "@/pages/Cuenta";
import Equipo from "@/pages/Equipo";
import AuthLayout from "@/layouts/AuthLayout";
import Login from "@/pages/Login";
import Invitacion from "@/pages/Invitacion";
import RestablecerContrasena from "@/pages/RestablecerContrasena";
import Dashboard from "@/pages/Dashboard";
import Branding from "@/pages/Branding";
import Companies from "@/pages/Companies";
import Usage from "@/pages/Usage";
import Billing from "@/pages/Billing";
import CompanyCreate from "@/pages/CompanyCreate";
import CompanyDetail from "@/pages/CompanyDetail";
import Wizard from "@/pages/onboarding/Wizard";
import CobrosAEmpresas from "@/pages/CobrosAEmpresas";
import NotFound from "@/pages/NotFound";

/**
 * Las rutas del panel.
 *
 * Las secciones que vienen después (empresas, facturación, equipo) NO tienen
 * ruta todavía. Aparecen desactivadas en el menú lateral, que es donde se
 * anuncia lo que llega; registrar rutas vacías sólo sirve para que alguien las
 * encuentre por la barra de direcciones y crea que algo se ha roto.
 */
export default function App() {
  const { autenticado, cargando, me } = useResellerAuth();

  /* Un socio que todavía está dándose de alta va al asistente, no al resumen.
     No es una preferencia de navegación: en esos dos estados el servidor sólo
     le abre el asistente y su marca, así que el resumen le contestaría 403 y
     vería una pantalla de error donde debería ver su primer paso. */
  const enAlta =
    autenticado && ["pending", "onboarding"].includes(String(me?.reseller.status || ""));

  return (
    <Routes>
      <Route
        path="/login"
        element={
          autenticado && !cargando
            ? <Navigate to="/dashboard" replace />
            : <AuthLayout><Login /></AuthLayout>
        }
      />
      {/* ── LAS DOS PUERTAS SIN SESIÓN ──────────────────────────────────────
          Fuera de `ProtectedRoute` a propósito, y no es un descuido: quien
          llega a activar su cuenta todavía no tiene contraseña —así que no
          puede tener sesión— y quien llega a restablecerla la ha perdido.
          Protegerlas las volvería inalcanzables justo para quien las necesita.

          Tampoco rebotan a `/dashboard` cuando SÍ hay sesión: alguien puede
          abrir el enlace de invitación de un compañero desde su propio
          navegador, y mandarlo a su panel le ocultaría que ese enlace no era
          para él. */}
      <Route path="/invitacion" element={<AuthLayout><Invitacion /></AuthLayout>} />
      <Route
        path="/auth/password-reset"
        element={<AuthLayout><RestablecerContrasena /></AuthLayout>}
      />

      <Route
        path="/"
        element={<Navigate to={enAlta ? "/onboarding" : "/dashboard"} replace />}
      />
      <Route
        path="/dashboard"
        element={
          enAlta
            ? <Navigate to="/onboarding" replace />
            : <ProtectedRoute><Dashboard /></ProtectedRoute>
        }
      />
      <Route path="/branding" element={<ProtectedRoute><Branding /></ProtectedRoute>} />
      {/* «new» antes que «:tenantId»: si no, la ruta con parámetro se queda con
          el alta y busca una empresa que se llame así. */}
      <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
      <Route path="/company-billing" element={<ProtectedRoute><CobrosAEmpresas /></ProtectedRoute>} />
      <Route path="/usage" element={<ProtectedRoute><Usage /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      {/* Las cuatro de la etapa D.1. Todas de lectura. */}
      <Route path="/contract" element={<ProtectedRoute><Contrato /></ProtectedRoute>} />
      <Route path="/entitlements" element={<ProtectedRoute><Derechos /></ProtectedRoute>} />
      {/* FASE 16 · la dirección por la que entra su gente: la que da CGuard
          Pro y, si la trae, la suya. */}
      <Route path="/domains" element={<ProtectedRoute><Dominios /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Actividad /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><Cuenta /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analitica /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Equipo /></ProtectedRoute>} />
      <Route path="/companies/new" element={<ProtectedRoute><CompanyCreate /></ProtectedRoute>} />
      <Route path="/companies/:tenantId" element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
      {/* El asistente va SIN el armazón: durante el alta no hay barra lateral
          que enseñar, porque todavía no hay nada a lo que navegar. */}
      <Route path="/onboarding" element={<ProtectedRoute sinArmazon><Wizard /></ProtectedRoute>} />
      <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
    </Routes>
  );
}
