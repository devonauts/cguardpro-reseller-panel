import { Link } from "react-router-dom";
import { useT } from "@/i18n/IdiomaProvider";

export function NotFound() {
  const t = useT();
  return (
    <div style={{ textAlign: "center", paddingTop: "var(--s-7)" }}>
      <h1 style={{ fontSize: 20, marginBottom: "var(--s-2)" }}>{t("noEncontrada.titulo")}</h1>
      <p style={{ fontSize: 13, color: "var(--ink-subtle)", marginBottom: "var(--s-4)" }}>
        {t("noEncontrada.nota")}
      </p>
      <Link to="/dashboard">{t("noEncontrada.volver")}</Link>
    </div>
  );
}

export default NotFound;
