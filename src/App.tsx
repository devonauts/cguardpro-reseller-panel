import { Navigate, Route, Routes } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import ProtectedRoute from "@/router/ProtectedRoute";
import AuthLayout from "@/layouts/AuthLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Branding from "@/pages/Branding";
import Wizard from "@/pages/onboarding/Wizard";
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
      {/* El asistente va SIN el armazón: durante el alta no hay barra lateral
          que enseñar, porque todavía no hay nada a lo que navegar. */}
      <Route path="/onboarding" element={<ProtectedRoute sinArmazon><Wizard /></ProtectedRoute>} />
      <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
    </Routes>
  );
}
