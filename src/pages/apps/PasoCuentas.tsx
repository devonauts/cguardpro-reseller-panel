import { useRef, useState } from "react";

import { Boton, Campo, CampoCopiable, Pildora, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { useT } from "@/i18n/IdiomaProvider";
import type { Clave } from "@/i18n/idioma";
import { fechaYHora } from "@/lib/dinero";
import {
  appsService, type CuentaDeTienda, type EstadoDeApps, type TiendaDeApps,
} from "@/services/resellerService";

/**
 * PASO 1 — LAS CUENTAS DEL SOCIO EN APPLE Y GOOGLE
 *
 * Cada paso dice QUÉ hacer, DÓNDE (enlace directo a la pantalla exacta) y POR
 * QUÉ. El socio marca lo que ya hizo; lo que se puede comprobar contra la
 * tienda (la clave de API, nuestra invitación, la cuenta de servicio) lo
 * comprueba el botón «Verificar», que habla de verdad con Apple y Google.
 *
 * Las llaves (.p8 y JSON) se leen del archivo en el navegador y viajan una vez;
 * el servidor las guarda cifradas y nunca las devuelve. Aquí sólo se ve
 * «cargada».
 */

interface Enlace { texto: Clave; url: string }
interface PasoGuia { id: string; titulo: Clave; texto: Clave; enlaces: Enlace[] }

const GUIA: Record<TiendaDeApps, PasoGuia[]> = {
  apple: [
    { id: "duns", titulo: "apps.apple.duns", texto: "apps.apple.dunsTexto",
      enlaces: [{ texto: "apps.enlace.buscarDuns", url: "https://developer.apple.com/enroll/duns-lookup/" }] },
    { id: "enrolled", titulo: "apps.apple.enrolled", texto: "apps.apple.enrolledTexto",
      enlaces: [{ texto: "apps.enlace.inscribirse", url: "https://developer.apple.com/programs/enroll/" }] },
    { id: "agreements", titulo: "apps.apple.agreements", texto: "apps.apple.agreementsTexto",
      enlaces: [{ texto: "apps.enlace.acuerdos", url: "https://appstoreconnect.apple.com/business" }] },
    { id: "invitedAdmin", titulo: "apps.apple.invitedAdmin", texto: "apps.apple.invitedAdminTexto",
      enlaces: [{ texto: "apps.enlace.usuarios", url: "https://appstoreconnect.apple.com/access/users" }] },
    { id: "apiKey", titulo: "apps.apple.apiKey", texto: "apps.apple.apiKeyTexto",
      enlaces: [
        { texto: "apps.enlace.claveApi", url: "https://appstoreconnect.apple.com/access/integrations/api" },
        { texto: "apps.enlace.teamId", url: "https://developer.apple.com/account#MembershipDetailsCard" },
      ] },
  ],
  google: [
    { id: "account", titulo: "apps.google.account", texto: "apps.google.accountTexto",
      enlaces: [{ texto: "apps.enlace.crearCuentaGoogle", url: "https://play.google.com/console/signup" }] },
    { id: "verified", titulo: "apps.google.verified", texto: "apps.google.verifiedTexto", enlaces: [] },
    { id: "invitedAdmin", titulo: "apps.google.invitedAdmin", texto: "apps.google.invitedAdminTexto",
      enlaces: [{ texto: "apps.enlace.usuariosGoogle", url: "https://play.google.com/console/users-and-permissions" }] },
    { id: "serviceAccount", titulo: "apps.google.serviceAccount", texto: "apps.google.serviceAccountTexto",
      enlaces: [
        { texto: "apps.enlace.proyecto", url: "https://console.cloud.google.com/projectcreate" },
        { texto: "apps.enlace.activarApi", url: "https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com" },
        { texto: "apps.enlace.cuentasServicio", url: "https://console.cloud.google.com/iam-admin/serviceaccounts" },
      ] },
    { id: "serviceAccountInvited", titulo: "apps.google.serviceAccountInvited", texto: "apps.google.serviceAccountInvitedTexto",
      enlaces: [{ texto: "apps.enlace.usuariosGoogle", url: "https://play.google.com/console/users-and-permissions" }] },
  ],
};

export function PasoCuentas({ estado, alCambiar }: { estado: EstadoDeApps; alCambiar: (e: EstadoDeApps) => void }) {
  const t = useT();
  const correo = estado.publisherEmail;
  return (
    <div className="apps-bloque">
      <p className="apps-intro">{t("apps.cuentasIntro")}</p>
      {correo ? (
        <CampoCopiable etiqueta={t("apps.correoQueInvitar")} valor={correo} />
      ) : (
        <p className="apps-aviso">{t("apps.sinCorreoPublicador")}</p>
      )}
      <div className="apps-dos">
        <Cuenta store="apple" cuenta={estado.accounts.apple} correo={correo} alCambiar={alCambiar} />
        <Cuenta store="google" cuenta={estado.accounts.google} correo={correo} alCambiar={alCambiar} />
      </div>
    </div>
  );
}

function Cuenta({
  store, cuenta, correo, alCambiar,
}: { store: TiendaDeApps; cuenta: CuentaDeTienda; correo: string | null; alCambiar: (e: EstadoDeApps) => void }) {
  const t = useT();
  const [campos, setCampos] = useState<Record<string, string>>({
    teamId: cuenta.data.teamId || "",
    issuerId: cuenta.data.issuerId || "",
    keyId: cuenta.data.keyId || "",
    developerId: cuenta.data.developerId || "",
  });
  const [llave, setLlave] = useState<{ nombre: string; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const pasos = GUIA[store];
  const hechos = pasos.filter((p) => cuenta.checklist?.[p.id]).length;
  const verificada = !!cuenta.verifiedAt && !!cuenta.verification?.ok;

  const leerLlave = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 64 * 1024) { setError(t("apps.llaveGrande")); return; }
    setLlave({ nombre: f.name, texto: await f.text() });
    setError(null);
  };

  const guardar = async () => {
    setGuardando(true); setError(null); setAviso(null);
    try {
      const datos: Record<string, string> = store === "apple"
        ? { teamId: campos.teamId, issuerId: campos.issuerId, keyId: campos.keyId }
        : { developerId: campos.developerId };
      if (llave) datos[store === "apple" ? "p8" : "serviceAccountJson"] = llave.texto;
      alCambiar(await appsService.guardarCuenta(store, datos));
      setLlave(null);
      setAviso(t("apps.guardado"));
    } catch (e: any) {
      setError(e?.message || t("apps.noGuardo"));
    } finally {
      setGuardando(false);
    }
  };

  const verificar = async () => {
    setVerificando(true); setError(null); setAviso(null);
    try {
      const r = await appsService.verificar(store);
      alCambiar(r.state);
    } catch (e: any) {
      setError(e?.message || t("apps.noVerifico"));
    } finally {
      setVerificando(false);
    }
  };

  const marcar = async (paso: string, hecho: boolean) => {
    try { alCambiar(await appsService.marcarPaso(store, paso, hecho)); } catch (e: any) { setError(e?.message || t("apps.noGuardo")); }
  };

  return (
    <Tarjeta>
      <TarjetaCabecera
        titulo={t(store === "apple" ? "apps.apple.titulo" : "apps.google.titulo")}
        nota={t("apps.pasosHechos", { a: hechos, b: pasos.length })}
      />
      <div className="apps-cuenta__estado">
        {verificada
          ? <Pildora tono="ok">{t("apps.verificada")}</Pildora>
          : <Pildora tono="aviso">{t("apps.sinVerificar")}</Pildora>}
        {cuenta.verifiedAt && <span className="apps-sutil">{fechaYHora(cuenta.verifiedAt)}</span>}
      </div>

      <ol className="apps-guia">
        {pasos.map((p, i) => {
          const hecho = !!cuenta.checklist?.[p.id];
          return (
            <li key={p.id} className={`apps-guia__paso${hecho ? " apps-guia__paso--hecho" : ""}`}>
              <label className="apps-guia__cabeza">
                <input type="checkbox" checked={hecho} onChange={(e) => marcar(p.id, e.target.checked)} />
                <span className="apps-guia__numero">{i + 1}</span>
                <span className="apps-guia__titulo">{t(p.titulo)}</span>
              </label>
              <p className="apps-guia__texto">{t(p.texto, { correo: correo || t("apps.nuestroCorreo") })}</p>
              {p.enlaces.length > 0 && (
                <div className="apps-guia__enlaces">
                  {p.enlaces.map((e) => (
                    <a key={e.url} href={e.url} target="_blank" rel="noreferrer noopener" className="apps-enlace">
                      {t(e.texto)} ↗
                    </a>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="apps-formulario">
        {store === "apple" ? (
          <>
            <Campo etiqueta={t("apps.apple.teamId")} ayuda={t("apps.apple.teamIdAyuda")} value={campos.teamId}
              onChange={(e) => setCampos({ ...campos, teamId: e.target.value })} maxLength={10} autoComplete="off" />
            <Campo etiqueta={t("apps.apple.issuerId")} value={campos.issuerId}
              onChange={(e) => setCampos({ ...campos, issuerId: e.target.value })} maxLength={36} autoComplete="off" />
            <Campo etiqueta={t("apps.apple.keyId")} value={campos.keyId}
              onChange={(e) => setCampos({ ...campos, keyId: e.target.value })} maxLength={10} autoComplete="off" />
          </>
        ) : (
          <Campo etiqueta={t("apps.google.developerId")} ayuda={t("apps.google.developerIdAyuda")} value={campos.developerId}
            onChange={(e) => setCampos({ ...campos, developerId: e.target.value })} maxLength={25} autoComplete="off" inputMode="numeric" />
        )}

        <div className="apps-llave">
          <div className="apps-llave__texto">
            <span className="apps-llave__titulo">{t(store === "apple" ? "apps.apple.llave" : "apps.google.llave")}</span>
            <span className="apps-sutil">
              {llave ? t("apps.llaveElegida", { nombre: llave.nombre })
                : cuenta.hasSecret ? t("apps.llaveCargada") : t("apps.llaveFalta")}
            </span>
            {store === "google" && cuenta.data.serviceAccountEmail && (
              <span className="apps-sutil">{cuenta.data.serviceAccountEmail}</span>
            )}
          </div>
          <Boton variante="suave" onClick={() => archivo.current?.click()}>
            {t(cuenta.hasSecret || llave ? "apps.llaveCambiar" : "apps.llaveSubir")}
          </Boton>
          <input
            ref={archivo}
            type="file"
            className="sr-only"
            accept={store === "apple" ? ".p8" : ".json,application/json"}
            aria-label={t(store === "apple" ? "apps.apple.llave" : "apps.google.llave")}
            onChange={leerLlave}
          />
        </div>

        <div className="apps-acciones">
          <Boton variante="primario" cargando={guardando} onClick={guardar}>{t("apps.guardar")}</Boton>
          <Boton variante="suave" cargando={verificando} disabled={!cuenta.hasSecret} onClick={verificar}>
            {t("apps.verificar")}
          </Boton>
        </div>
        {aviso && <p className="apps-ok" role="status">{aviso}</p>}
        {error && <p className="apps-error" role="alert">{error}</p>}

        {cuenta.verification && (
          <ul className="apps-checks">
            {cuenta.verification.checks.map((c) => (
              <li key={c.clave} className="apps-checks__fila">
                <Pildora tono={c.ok === true ? "ok" : c.ok === false ? "peligro" : "aviso"}>
                  {t(c.ok === true ? "apps.check.bien" : c.ok === false ? "apps.check.mal" : "apps.check.pendiente")}
                </Pildora>
                <span className="apps-checks__texto">
                  <strong>{t(`apps.check.${c.clave}` as Clave)}</strong>
                  {c.detalle && <span className="apps-sutil"> — {c.detalle}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tarjeta>
  );
}

export default PasoCuentas;
