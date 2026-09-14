import { Navigate, Route, Routes } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import ProtectedRoute from "@/router/ProtectedRoute";
import AuthLayout from "@/layouts/AuthLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

/**
 * Las rutas del panel. Tres, a propósito: entrar, el resumen y el resto.
 *
 * Las secciones que vienen después (empresas, facturación, marca, equipo) NO
 * tienen ruta todavía. Aparecen desactivadas en el menú lateral, que es donde
 * se anuncia lo que llega; registrar rutas vacías sólo sirve para que alguien
 * las encuentre por la barra de direcciones y crea que algo se ha roto.
 */
export default function App() {
  const { autenticado, cargando } = useResellerAuth();

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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
    </Routes>
  );
}
