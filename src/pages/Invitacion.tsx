import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { CamposDeClave, claveCompleta } from "@/components/acceso";
import { Boton, Icono } from "@/components/cristal";
import { invitacionService, type InvitacionDeSocio } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./Login.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ACTIVAR LA CUENTA — LA PANTALLA QUE FALTABA
 *
 * El alta de un socio emitía una invitación desde la Fase 1 y NADIE la recibía:
 * no había correo que la llevara ni pantalla que la aceptara. El resultado era
 * un socio con cuenta, sin contraseña y sin saberlo. Aquí aterriza el enlace
 * del correo de bienvenida.
 *
 * ── SIN SESIÓN, Y NO PUEDE SER DE OTRA MANERA ─────────────────────────────
 * Quien llega no tiene contraseña todavía, así que no puede tener sesión. Por
 * eso la ruta va FUERA de `ProtectedRoute` y las dos llamadas son a
 * `/api/public/reseller-invitation/*`, que el servidor monta antes de la
 * autenticación.
 *
 * ── SE ENTRA SOLO, PERO POR LA PUERTA DE SIEMPRE ──────────────────────────
 * Al terminar no se inventa una sesión: se llama al MISMO `/auth/sign-in` con
 * la contraseña que la persona acaba de poner. Un segundo emisor de sesiones
 * sería un segundo sitio donde se decide quién entra, y uno de los dos acabaría
 * quedándose atrás. Si ese inicio de sesión fallara, queda la pantalla de
 * entrada — la contraseña YA está puesta, así que nadie se queda fuera.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function Invitacion() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { entrar } = useResellerAuth();
  const t = useT();

  const token = params.get("token") || "";

  const [cargando, setCargando] = useState(true);
  const [invitacion, setInvitacion] = useState<InvitacionDeSocio | null>(null);
  const [caduco, setCaduco] = useState(false);
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (!token) { setCaduco(true); setCargando(false); return () => { vivo = false; }; }

    invitacionService.ver(token)
      .then((r) => { if (vivo) setInvitacion(r.invitation); })
      /* Un 404 aquí es «este enlace ya no sirve», y da igual por qué: caducado,
         usado o inventado. El servidor no lo distingue a propósito y la
         pantalla tampoco lo inventa. */
      .catch(() => { if (vivo) setCaduco(true); })
      .finally(() => { if (vivo) setCargando(false); });

    return () => { vivo = false; };
  }, [token]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || !invitacion) return;
    if (clave !== repetida) { setError(t("clave.noCoincide")); return; }
    if (!claveCompleta(clave)) { setError(t("clave.debil")); return; }

    setError(null);
    setEnviando(true);
    try {
      await invitacionService.aceptar(token, clave);
      try {
        await entrar(String(invitacion.email || ""), clave);
        navegar("/", { replace: true });
      } catch {
        // La cuenta ya está activa: sólo falló el atajo de entrar.
        navegar("/login", { replace: true });
      }
    } catch (err: any) {
      const estado = Number(err?.status || 0);
      if (estado === 404) { setCaduco(true); setInvitacion(null); }
      else setError(err?.message || t("invitacion.fallo"));
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="acceso">
        <header className="acceso__cabecera">
          <p className="acceso__rotulo">{t("login.acceso")}</p>
          <h1 className="acceso__titulo">{t("invitacion.comprobando")}</h1>
        </header>
      </div>
    );
  }

  if (caduco || !invitacion) {
    return (
      <div className="acceso">
        <header className="acceso__cabecera">
          <p className="acceso__rotulo">{t("login.acceso")}</p>
          <h1 className="acceso__titulo">{t("invitacion.caducadoTitulo")}</h1>
          <p className="acceso__sub">{t("invitacion.caducadoSub")}</p>
        </header>
        <div className="acceso__campos">
          <Boton bloque className="acceso__enviar" onClick={() => navegar("/login")}>
            {t("invitacion.irAEntrar")}
          </Boton>
        </div>
      </div>
    );
  }

  /* Quien YA tenía contraseña —porque es usuario de una empresa o de otro
     socio— no pone ninguna: se le manda a entrar con la que usa. Pedirle una
     nueva le haría creer que tiene dos. */
  if (!invitacion.needsPassword) {
    return (
      <div className="acceso">
        <header className="acceso__cabecera">
          <p className="acceso__rotulo">{t("login.acceso")}</p>
          <h1 className="acceso__titulo">
            {t("invitacion.titulo", { socio: invitacion.resellerName || "" })}
          </h1>
          <p className="acceso__sub">{t("invitacion.yaTieneClave")}</p>
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
        <h1 className="acceso__titulo">
          {t("invitacion.titulo", { socio: invitacion.resellerName || "" })}
        </h1>
        <p className="acceso__sub">
          {t("invitacion.sub", { correo: invitacion.email || "" })}
        </p>
      </header>

      <div className="acceso__campos">
        <CamposDeClave
          clave={clave}
          repetida={repetida}
          onClave={setClave}
          onRepetida={setRepetida}
          etiqueta={t("clave.crea")}
        />

        {error && <p role="alert" className="acceso__error">{error}</p>}

        <Boton type="submit" bloque cargando={enviando} className="acceso__enviar">
          {t("invitacion.activar")}
          {!enviando && <Icono nombre="flecha" tamano={18} />}
        </Boton>
      </div>
    </form>
  );
}

export default Invitacion;
