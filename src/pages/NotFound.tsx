import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div style={{ textAlign: "center", paddingTop: "var(--s-7)" }}>
      <h1 style={{ fontSize: 20, marginBottom: "var(--s-2)" }}>Esta página no existe</h1>
      <p style={{ fontSize: 13, color: "var(--ink-subtle)", marginBottom: "var(--s-4)" }}>
        Puede que el enlace esté anticuado.
      </p>
      <Link to="/dashboard">Volver al resumen</Link>
    </div>
  );
}

export default NotFound;
