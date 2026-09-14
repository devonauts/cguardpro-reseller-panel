import { FormEvent, useState } from "react";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Boton, Campo } from "@/components/ui/kit";

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
      setError(err?.message || "No se pudo iniciar sesión. Revisa tus datos.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Panel de socio</h1>
      <p style={{ fontSize: 13, color: "var(--ink-subtle)", marginBottom: "var(--s-5)" }}>
        Entra con la cuenta que te invitamos a usar.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
        <Campo
          etiqueta="Correo"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Contraseña"
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

        <Boton type="submit" bloque cargando={enviando}>Entrar</Boton>
      </div>
    </form>
  );
}

export default Login;
