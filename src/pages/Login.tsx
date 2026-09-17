import { FormEvent, useState } from "react";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Boton, Campo } from "@/components/ui/kit";
import { useT } from "@/i18n/IdiomaProvider";

/**
 * Entrar al panel.
 *
 * Usa el mismo `/auth/sign-in` de siempre con `app: 'reseller'`. No hay una
 * segunda implementación de autenticación, y no la va a haber: dos formas de
 * demostrar quién eres son dos formas de equivocarse.
 *
 * El estado comercial NO cierra esta puerta. Un socio moroso o en cierre tiene
 * que poder entrar — si no, no puede llegar a la pantalla donde se arregla.
 */
export function Login() {
  const { entrar } = useResellerAuth();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setError(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), password);
    } catch (err: any) {
      /* Deliberadamente genérico: distinguir «no existe ese correo» de «la
         contraseña no es» convierte esta pantalla en un comprobador de qué
         cuentas existen. */
      setError(err?.message || t("login.fallo"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{t("login.titulo")}</h1>
      <p style={{ fontSize: 13, color: "var(--ink-subtle)", marginBottom: "var(--s-5)" }}>
        {t("login.sub")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
        <Campo
          etiqueta={t("login.correo")}
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta={t("login.contrasena")}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
        )}

        <Boton type="submit" bloque cargando={enviando}>{t("login.entrar")}</Boton>
      </div>
    </form>
  );
}

export default Login;
