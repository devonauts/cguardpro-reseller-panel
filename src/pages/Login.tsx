import { FormEvent, useState } from "react";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Boton, Campo, Icono } from "@/components/cristal";
import { recuperacionService } from "@/services/resellerService";
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
 *
 * ── LA RECUPERACIÓN VA DENTRO, NO EN OTRA RUTA ────────────────────────────
 * Es un paso más de la misma tarjeta. Una ruta aparte obliga a volver atrás
 * para entrar, y quien acaba de pedir el enlace lo que quiere es esperarlo
 * aquí mismo.
 */

/** El correo de soporte de la plataforma. Es REAL — no un enlace de adorno. */
const SOPORTE = "support@cguardpro.com";

export function Login() {
  const { entrar } = useResellerAuth();
  const t = useT();

  const [modo, setModo] = useState<"entrar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
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

  const pedirEnlace = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || !email.trim()) return;
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      await recuperacionService.pedirEnlace(email.trim());
    } catch {
      /* Se ignora a propósito el resultado: un 404 significaría «ese correo no
         está registrado», y contarlo delataría qué cuentas existen. Sólo un
         fallo de RED merece un mensaje distinto, y ése lo da el `catch` de
         abajo... que tampoco distingue. Se responde siempre lo mismo. */
    } finally {
      setEnviando(false);
      setAviso(t("login.recuperarHecho"));
    }
  };

  const volver = () => {
    setModo("entrar");
    setAviso(null);
    setError(null);
  };

  if (modo === "recuperar") {
    return (
      <form onSubmit={pedirEnlace} noValidate className="acceso">
        <header className="acceso__cabecera">
          <p className="acceso__rotulo">{t("login.acceso")}</p>
          <h1 className="acceso__titulo">{t("login.recuperarTitulo")}</h1>
          <p className="acceso__sub">{t("login.recuperarSub")}</p>
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

          {aviso && <p role="status" className="acceso__aviso">{aviso}</p>}

          <Boton type="submit" bloque cargando={enviando} className="acceso__enviar">
            {t("login.recuperarEnviar")}
          </Boton>

          <button type="button" className="acceso__enlace acceso__enlace--centro" onClick={volver}>
            {t("login.volverAEntrar")}
          </button>
        </div>
      </form>
    );
  }

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

        <button
          type="button"
          className="acceso__enlace acceso__enlace--derecha"
          onClick={() => { setModo("recuperar"); setError(null); }}
        >
          {t("login.olvide")}
        </button>

        {error && <p role="alert" className="acceso__error">{error}</p>}

        <Boton type="submit" bloque cargando={enviando} className="acceso__enviar">
          {t("login.entrar")}
          {!enviando && <Icono nombre="flecha" tamano={18} />}
        </Boton>
      </div>

      <p className="acceso__pie">
        {t("login.ayuda")}{" "}
        <a href={`mailto:${SOPORTE}`}>{t("login.contactar")}</a>
      </p>
    </form>
  );
}

export default Login;
