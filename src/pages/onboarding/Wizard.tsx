import { useCallback, useEffect, useState } from "react";
import BrandingForm from "@/components/BrandingForm";
import BrandingPreview from "@/components/BrandingPreview";
import { Boton, Dato, EstadoDeDatos, TodaviaNo } from "@/components/cristal";
import {
  activacionService, onboardingService,
  type EstadoDeActivacion, type EstadoDelAlta, type MarcaEditable, type PasoDelAlta,
} from "@/services/resellerService";
import { useNavigate } from "react-router-dom";
import { useResellerAuth } from "@/auth/ResellerAuthContext";
import { Activacion } from "./Activacion";
import { FirmaDelContrato } from "./FirmaDelContrato";
import { useT } from "@/i18n/IdiomaProvider";
import SelectorDeIdioma from "@/i18n/SelectorDeIdioma";
import type { Clave } from "@/i18n/idioma";
import "./Wizard.scss";

/**
 * El asistente de alta.
 *
 * ── EL PASO LO SABE EL SERVIDOR ───────────────────────────────────────────
 * Esta pantalla no guarda el paso en ningún sitio: lo pide al entrar y lo
 * vuelve a recibir en cada respuesta. Por eso cerrar la pestaña y volver
 * —incluso desde otro ordenador— reanuda donde se dejó, y por eso cambiar la
 * URL o tocar el almacenamiento local no adelanta nada: no hay nada local que
 * tocar.
 *
 * Lo que se manda es «vengo del paso X». El servidor comprueba si eso es cierto
 * y si lo que ese paso pide está cumplido. Un `X` del futuro se rechaza.
 *
 * ── LO QUE NO PIDE ────────────────────────────────────────────────────────
 * Ni un dominio propio, ni crear una empresa. Un socio que acaba de firmar no
 * tiene ninguna de las dos cosas, y es exactamente cuando hace esto.
 */

const TITULO: Record<PasoDelAlta, Clave> = {
  welcome: "alta.pasoWelcome",
  identity: "alta.pasoIdentity",
  subdomain: "alta.pasoSubdomain",
  platform_name: "alta.pasoPlatformName",
  logo: "alta.pasoLogo",
  favicon: "alta.pasoFavicon",
  appearance: "alta.pasoAppearance",
  support: "alta.pasoSupport",
  review: "alta.pasoReview",
  publish: "alta.pasoPublish",
};

export function Wizard() {
  const t = useT();
  const [est, setEst] = useState<EstadoDelAlta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [borrador, setBorrador] = useState<MarcaEditable>({});
  /* PRIMERO SE PAGA EL ALTA. Si falta, el asistente enseña la activación en
     su mismo marco; el servidor no le abriría los pasos de todas formas. */
  const [activacion, setActivacion] = useState<EstadoDeActivacion | null>(null);
  const { recargar, salir, me } = useResellerAuth();
  const navigate = useNavigate();

  /* A partner who already paid is activated by the server the moment the
     wizard completes. Without this they stayed on the final screen reading
     "we still have to activate your account" until they reloaded. */
  const activo = String(me?.reseller.status || "") === "active";
  useEffect(() => {
    if (activo && est?.completed) navigate("/dashboard", { replace: true });
  }, [activo, est?.completed, navigate]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const a = await activacionService.estado().catch(() => null);
      setActivacion(a);
      if (a?.required) return;
      const r = await onboardingService.estado();
      setEst(r);
      setBorrador({});
    } catch (e: any) {
      setError(e?.message || t("alta.noCargo"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const paso = est?.step;
  const marca = est ? { ...est.branding, ...borrador } as any : null;

  const continuar = async () => {
    if (!est || enviando || paso === "completed" || !paso) return;
    setEnviando(true);
    setError(null);
    try {
      if (paso === "publish") {
        const r = await onboardingService.completar();
        setEst(r);
        await recargar();
        return;
      }
      /* ── LO QUE SE VE ES LO QUE SE MANDA ──────────────────────────────
         El paso de los colores EXIGE tono e intensidad, y el formulario ya
         enseña los de fábrica (222 / 0.15) con la vista previa aplicada. Pero
         si el socio no tocaba los deslizadores, el borrador iba vacío y el
         servidor contestaba «Elige un color de marca» sobre una pantalla que
         mostraba un color elegido. Quedarse mirando qué falta ahí es fácil.

         Se manda lo que está a la vista. Son los MISMOS valores por defecto que
         pinta `BrandingForm`: si algún día cambian allí, cambian aquí — por eso
         el comentario nombra el archivo. */
      const aEnviar = paso === "appearance"
        ? {
          brandHue: marca?.brandHue ?? 222,
          brandChroma: marca?.brandChroma ?? 0.15,
          ...borrador,
        }
        : borrador;

      const r = await onboardingService.avanzar(paso, aEnviar);
      setEst(r);
      setBorrador({});
    } catch (e: any) {
      setError(e?.message || t("alta.noContinuar"));
    } finally {
      setEnviando(false);
    }
  };

  const atras = async () => {
    if (!est || enviando || paso === "completed" || !paso) return;
    const anterior = est.steps.find((s) => s.index === est.stepIndex - 1);
    if (!anterior) return;
    setEnviando(true);
    try {
      const r = await onboardingService.atras(anterior.id);
      setEst(r);
      setBorrador({});
    } catch (e: any) {
      setError(e?.message || t("alta.noVolver"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="alta">
      {/* Durante el alta no hay armazón, así que el idioma vive aquí: quien se
          está dando de alta también tiene que poder cambiarlo. */}
      <div className="alta__idioma">
        <SelectorDeIdioma compacto />
        {/* No shell during onboarding, so the only way out lives here too:
            someone in the wrong account, or with no contract yet, was trapped. */}
        <Boton variante="fantasma" onClick={salir}>{t("armazon.cerrarSesion")}</Boton>
      </div>
      {/* Wide on the steps that show the login preview: it has to be seen big. */}
      <div className={`alta__caja${paso === "appearance" || paso === "review" ? " alta__caja--ancha" : ""}`}>
        <EstadoDeDatos
          cargando={cargando}
          error={!est && !activacion?.required ? error : null}
          onReintentar={cargar}
        >
          {/* FIRST THE AGREEMENT, THEN THE REGISTRATION: the server refuses the
              payment until it is signed, so the screen follows the same order. */}
          {activacion?.required && !activacion.agreementSigned && (
            <FirmaDelContrato
              onFirmado={async () => {
                const a = await activacionService.estado().catch(() => null);
                setActivacion(a);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {activacion?.required && activacion.agreementSigned && (
            <Activacion
              estado={activacion}
              onPagada={async () => {
                /* El pago movió el estado del socio (a `onboarding`, o a
                   `active` si ya había terminado el asistente): se relee `/me`
                   y, si ya está activo, se le lleva a su panel. */
                await recargar();
                const a = await activacionService.estado().catch(() => null);
                setActivacion(a);
                await cargar();
                navigate("/", { replace: true });
              }}
            />
          )}

          {est && est.completed && <Final est={est} />}

          {est && !est.completed && paso && paso !== "completed" && marca && (
            <>
              <header className="alta__cabecera">
                <p className="alta__contador">
                  {t("alta.contador", { a: est.stepIndex + 1, b: est.totalSteps })}
                </p>
                <h1 className="alta__titulo">{t(TITULO[paso])}</h1>
                {/* La barra es decorativa; el contador de arriba es lo que se
                    lee. Por eso lleva `aria-hidden` y no `progressbar`. */}
                <div className="alta__barra" aria-hidden="true">
                  <span
                    className="alta__progreso"
                    style={{ width: `${(est.stepIndex / est.totalSteps) * 100}%` }}
                  />
                </div>
              </header>

              <div className="alta__cuerpo">
                <Contenido
                  paso={paso}
                  est={est}
                  marca={marca}
                  onCambio={(p) => setBorrador((b) => ({ ...b, ...p }))}
                  onImagenSubida={(m) => setEst((e) => (e ? { ...e, branding: m } : e))}
                />
              </div>

              {error && <p role="alert" className="alta__error">{error}</p>}

              <footer className="alta__pie">
                <Boton
                  variante="fantasma"
                  onClick={atras}
                  disabled={est.stepIndex === 0 || enviando}
                >
                  {t("alta.atras")}
                </Boton>
                <Boton onClick={continuar} cargando={enviando}>
                  {t(paso === "publish" ? "alta.publicarYTerminar" : "alta.continuar")}
                </Boton>
              </footer>
            </>
          )}
        </EstadoDeDatos>
      </div>
    </main>
  );
}

/* ── El final ────────────────────────────────────────────────────────────── */

/**
 * LO QUE VE EL SOCIO CUANDO TERMINA, y por qué hacía falta.
 *
 * El asistente terminaba con `navigate("/dashboard")`. Pero terminar el alta NO
 * activa comercialmente al socio —eso lo decide CGuardPro, y es deliberado—, así
 * que su estado sigue siendo `pending`; y con `pending`, `App.tsx` manda de
 * vuelta a `/onboarding`, que al ver el alta completada volvía a `/dashboard`.
 * Un bucle, y en pantalla un «Cargando…» que no se iba nunca. Justo en el
 * último clic del alta, que es el peor sitio donde dejar a alguien tirado.
 *
 * Ahora el asistente se cierra él mismo: enseña qué quedó publicado, dice qué
 * falta —que lo activemos— y a dónde escribir. Cuando superadmin lo active, el
 * estado deja de ser `pending`, `App.tsx` ya no manda aquí y el socio entra a su
 * panel sin tener que hacer nada.
 */
function Final({ est }: { est: EstadoDelAlta }) {
  const t = useT();
  const anfitrion = est.platformHostname;

  return (
    <>
      <header className="alta__cabecera">
        <p className="alta__contador">{t("alta.finalRotulo")}</p>
        <h1 className="alta__titulo">{t("alta.finalTitulo")}</h1>
        <div className="alta__barra" aria-hidden="true">
          <span className="alta__progreso" style={{ width: "100%" }} />
        </div>
      </header>

      <div className="alta__cuerpo">
        <p className="alta__texto">{t("alta.finalSub")}</p>

        <dl className="alta__datos">
          <Dato etiqueta={t("alta.finalNombre")} valor={est.branding.platformName} />
          {anfitrion && <Dato etiqueta={t("alta.finalDireccion")} valor={anfitrion} />}
          <Dato etiqueta={t("alta.finalSoporte")} valor={est.branding.supportEmail} />
        </dl>

        <p className="alta__apunte">{t("alta.finalQueSigue")}</p>
      </div>
    </>
  );
}

/* ── El contenido de cada paso ───────────────────────────────────────────── */

function Contenido({
  paso, est, marca, onCambio, onImagenSubida,
}: {
  paso: PasoDelAlta;
  est: EstadoDelAlta;
  marca: any;
  onCambio: (p: MarcaEditable) => void;
  onImagenSubida: (m: any) => void;
}) {
  const t = useT();
  switch (paso) {
    case "welcome":
      return (
        <div className="alta__texto">
          <p>{t("alta.welcome1")}</p>
          <p className="alta__apunte">{t("alta.welcome2")}</p>
        </div>
      );

    case "identity":
      return (
        <>
          <p className="alta__texto">{t("alta.identity1")}</p>
          <dl className="alta__datos">
            <Dato etiqueta={t("alta.identityRazonSocial")} valor={est.identity.legalName} />
            <Dato etiqueta={t("alta.identityNombreComercial")} valor={est.identity.displayName} />
            <Dato etiqueta={t("alta.identityCodigo")} valor={est.identity.publicId} />
            <Dato etiqueta={t("alta.identityPais")} valor={est.identity.country} />
          </dl>
        </>
      );

    case "subdomain":
      return est.platformHostname ? (
        <>
          <p className="alta__texto">{t("alta.subdomain1")}</p>
          <p className="alta__host">{est.platformHostname}</p>
          <p className="alta__apunte">{t("alta.subdomain2")}</p>
        </>
      ) : (
        <TodaviaNo>{t("alta.subdomainVacio")}</TodaviaNo>
      );

    case "platform_name":
      return (
        <>
          <p className="alta__texto">{t("alta.platformName1")}</p>
          <BrandingForm marca={marca} campos={["platformName"]} onCambio={onCambio} />
        </>
      );

    case "logo":
    case "favicon":
      return (
        <>
          <p className="alta__texto">{t(paso === "logo" ? "alta.logo1" : "alta.favicon1")}</p>
          <p className="alta__apunte">{t("alta.logoApunte")}</p>
          <BrandingForm
            marca={marca}
            campos={[]}
            // Both logos in the logo step: light-background and dark-background,
            // since the login shows in both themes.
            ranuras={paso === "logo" ? ["logo", "logoDark"] : ["favicon"]}
            onCambio={onCambio}
            onImagenSubida={onImagenSubida}
          />
        </>
      );

    case "appearance":
      return (
        <div className="alta__apilado">
          <BrandingForm
            marca={marca}
            campos={["brandHue", "brandChroma", "fontFamily"]}
            onCambio={onCambio}
          />
          <BrandingPreview marca={marca} titulo={t("alta.asiSeVera")} />
        </div>
      );

    case "support":
      return (
        <>
          <p className="alta__texto">{t("alta.support1")}</p>
          <BrandingForm
            marca={marca}
            campos={["supportEmail", "supportPhone", "supportUrl", "loginTagline"]}
            onCambio={onCambio}
          />
        </>
      );

    case "review":
      return (
        <div className="alta__apilado">
          <dl className="alta__datos">
            <Dato etiqueta={t("alta.reviewNombre")} valor={marca.platformName} />
            <Dato etiqueta={t("alta.reviewFrase")} valor={marca.loginTagline} />
            <Dato etiqueta={t("alta.reviewCorreoSoporte")} valor={marca.supportEmail} />
            <Dato etiqueta={t("alta.reviewTelefono")} valor={marca.supportPhone} />
            <Dato etiqueta={t("alta.reviewWebSoporte")} valor={marca.supportUrl} />
            <Dato
              etiqueta={t("alta.reviewLogotipo")}
              valor={t(marca.logoFileId ? "alta.reviewCargado" : "alta.reviewSinSubir")}
            />
            <Dato
              etiqueta={t("alta.reviewIcono")}
              valor={t(marca.faviconFileId ? "alta.reviewCargado" : "alta.reviewSinSubir")}
            />
          </dl>
          <BrandingPreview marca={marca} titulo={t("alta.asiLoVeran")} />
        </div>
      );

    case "publish":
      return (
        <div className="alta__texto">
          <p>{t("alta.publish1")}</p>
          <p className="alta__apunte">{t("alta.publish2")}</p>
        </div>
      );

    default:
      return null;
  }
}

export default Wizard;
