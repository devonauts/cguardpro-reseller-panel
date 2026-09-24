import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CamposDeClave, claveCompleta } from "@/components/acceso";
import { Boton, Icono } from "@/components/cristal";
import { recuperacionService } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./Login.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PONER UNA CONTRASEÑA NUEVA
 *
 * El destino del enlace de «¿olvidaste tu contraseña?». Hasta ahora ese enlace
 * llegaba a `app.cguardpro.com` —el CRM—, porque el servidor no sabía de qué
 * puerta venía la petición y el panel no se lo decía. Ahora la recuperación
 * manda `app: 'reseller'`, el enlace apunta aquí, y aquí hay algo que lo
 * atiende.
 *
 * Usa el `PUT /auth/password-reset` de siempre: no hay una segunda
 * implementación de nada de autenticación, igual que la entrada usa el
 * `/auth/sign-in` común.
 *
 * ── NO SE ENTRA SOLO ──────────────────────────────────────────────────────
 * A diferencia de la activación, aquí no se conoce el correo: el testigo del
 * enlace no lo cuenta, y no debe hacerlo. Al terminar se manda a la pantalla de
 * entrada con el aviso de que ya puede entrar.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function RestablecerContrasena() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const t = useT();

  const token = params.get("token") || "";

  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  /* An expired or used link used to leave the form on screen with an error
     and no way forward; it now shows the dead-link screen. */
  const [caducado, setCaducado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    if (clave !== repetida) { setError(t("clave.noCoincide")); return; }
    if (!claveCompleta(clave)) { setError(t("clave.debil")); return; }

    setError(null);
    setEnviando(true);
    try {
      await recuperacionService.restablecer(token, clave);
      setListo(true);
    } catch (err: any) {
      if (/invalidToken|expired/i.test(String(err?.messageCode || ""))) { setCaducado(true); return; }
      setError(err?.message || t("clave.falloRestablecer"));
    } finally {
      setEnviando(false);
    }
  };

  if (!token || caducado) {
    return (
      <div className="acceso">
        <header className="acceso__cabecera">
          <p className="acceso__rotulo">{t("login.acceso")}</p>
          <h1 className="acceso__titulo">{t("invitacion.caducadoTitulo")}</h1>
          <p className="acceso__sub">{t("clave.sinTestigo")}</p>
        </header>
        <div className="acceso__campos">
          <Boton bloque className="acceso__enviar" onClick={() => navegar("/login")}>
            {t("invitacion.irAEntrar")}
          </Boton>
        </div>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="acceso">
        <header className="acceso__cabecera">
          <p className="acceso__rotulo">{t("login.acceso")}</p>
          <h1 className="acceso__titulo">{t("clave.listaTitulo")}</h1>
          <p className="acceso__sub">{t("clave.listaSub")}</p>
        </header>
        <div className="acceso__campos">
          <Boton bloque className="acceso__enviar" onClick={() => navegar("/login")}>
            {t("invitacion.irAEntrar")}
            <Icono nombre="flecha" tamano={18} />
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="acceso">
      <header className="acceso__cabecera">
        <p className="acceso__rotulo">{t("login.acceso")}</p>
        <h1 className="acceso__titulo">{t("clave.restablecerTitulo")}</h1>
        <p className="acceso__sub">{t("clave.restablecerSub")}</p>
      </header>

      <div className="acceso__campos">
        <CamposDeClave
          clave={clave}
          repetida={repetida}
          onClave={setClave}
          onRepetida={setRepetida}
        />

        {error && <p role="alert" className="acceso__error">{error}</p>}

        <Boton type="submit" bloque cargando={enviando} className="acceso__enviar">
          {t("clave.guardar")}
          {!enviando && <Icono nombre="flecha" tamano={18} />}
        </Boton>
      </div>
    </form>
  );
}

export default RestablecerContrasena;
