import { FormEvent, useState } from "react";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Boton, Campo, Icono } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import "./Login.scss";

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
    <form onSubmit={enviar} noValidate className="acceso">
      <header className="acceso__cabecera">
        <p className="acceso__rotulo">{t("login.acceso")}</p>
        <h1 className="acceso__titulo">{t("login.bienvenido")}</h1>
        <p className="acceso__sub">{t("login.sub")}</p>
      </header>

      <div className="acceso__campos">
        <Campo
          etiqueta={t("login.correo")}
          icono="correo"
          type="email"
          name="email"
          autoComplete="username"
          placeholder={t("login.correoMarcador")}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta={t("login.contrasena")}
          icono="candado"
          revelable
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder={t("login.contrasenaMarcador")}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p role="alert" className="acceso__error">{error}</p>}

        <Boton type="submit" bloque cargando={enviando} className="acceso__enviar">
          {t("login.entrar")}
          {!enviando && <Icono nombre="flecha" tamano={18} />}
        </Boton>
      </div>
    </form>
  );
}

export default Login;
