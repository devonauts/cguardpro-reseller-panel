import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandingForm from "@/components/BrandingForm";
import BrandingPreview from "@/components/BrandingPreview";
import { Boton, Dato, EstadoDeDatos, TodaviaNo } from "@/components/ui/kit";
import {
  onboardingService, type EstadoDelAlta, type MarcaEditable, type PasoDelAlta,
} from "@/services/resellerService";
import "./Wizard.css";

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

const TITULO: Record<PasoDelAlta, string> = {
  welcome: "Bienvenido",
  identity: "Tus datos",
  subdomain: "Tu dirección",
  platform_name: "Tu nombre",
  logo: "Tu logotipo",
  favicon: "Tu icono",
  appearance: "Tus colores",
  support: "Tu soporte",
  review: "Revisión",
  publish: "Publicar",
};

export function Wizard() {
  const navigate = useNavigate();
  const [est, setEst] = useState<EstadoDelAlta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [borrador, setBorrador] = useState<MarcaEditable>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await onboardingService.estado();
      setEst(r);
      setBorrador({});
      if (r.completed) navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar tu alta.");
    } finally {
      setCargando(false);
    }
  }, [navigate]);

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
        navigate("/dashboard", { replace: true });
        return;
      }
      const r = await onboardingService.avanzar(paso, borrador);
      setEst(r);
      setBorrador({});
    } catch (e: any) {
      setError(e?.message || "No se pudo continuar.");
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
      setError(e?.message || "No se pudo volver.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="alta">
      <div className="alta__caja">
        <EstadoDeDatos cargando={cargando} error={!est ? error : null} onReintentar={cargar}>
          {est && paso && paso !== "completed" && marca && (
            <>
              <header className="alta__cabecera">
                <p className="alta__contador">
                  Paso {est.stepIndex + 1} de {est.totalSteps}
                </p>
                <h1 className="alta__titulo">{TITULO[paso]}</h1>
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
                  Atrás
                </Boton>
                <Boton onClick={continuar} cargando={enviando}>
                  {paso === "publish" ? "Publicar y terminar" : "Continuar"}
                </Boton>
              </footer>
            </>
          )}
        </EstadoDeDatos>
      </div>
    </main>
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
  switch (paso) {
    case "welcome":
      return (
        <div className="alta__texto">
          <p>
            Vamos a dejar tu plataforma con tu marca. Son unos minutos y puedes
            parar cuando quieras: se guarda lo que lleves hecho.
          </p>
          <p className="alta__apunte">
            No hace falta que tengas empresas dadas de alta todavía, ni un
            dominio propio.
          </p>
        </div>
      );

    case "identity":
      return (
        <>
          <p className="alta__texto">
            Esto es lo que tenemos registrado. Si algo no cuadra, escríbenos
            antes de seguir.
          </p>
          <dl className="alta__datos">
            <Dato etiqueta="Razón social" valor={est.identity.legalName} />
            <Dato etiqueta="Nombre comercial" valor={est.identity.displayName} />
            <Dato etiqueta="Código" valor={est.identity.publicId} />
            <Dato etiqueta="País" valor={est.identity.country} />
          </dl>
        </>
      );

    case "subdomain":
      return est.platformHostname ? (
        <>
          <p className="alta__texto">Tu dirección reservada:</p>
          <p className="alta__host">{est.platformHostname}</p>
          <p className="alta__apunte">
            Está reservada a tu nombre, pero todavía no está en servicio: la
            activamos nosotros más adelante. Mientras tanto puedes seguir con el
            resto del alta — no tienes que hacer nada aquí.
          </p>
        </>
      ) : (
        <TodaviaNo>
          Todavía no hay una dirección reservada para ti. No bloquea nada del
          alta; lo revisamos por nuestra parte.
        </TodaviaNo>
      );

    case "platform_name":
      return (
        <>
          <p className="alta__texto">
            El nombre que verán tus clientes al entrar. El nuestro no aparece.
          </p>
          <BrandingForm marca={marca} campos={["platformName"]} onCambio={onCambio} />
        </>
      );

    case "logo":
    case "favicon":
      return (
        <>
          <p className="alta__texto">
            {paso === "logo"
              ? "Tu logotipo, para su pantalla de entrada."
              : "El icono pequeño de la pestaña del navegador."}
          </p>
          <p className="alta__apunte">
            Puedes saltarte este paso y subirlo más tarde desde «Tu marca».
          </p>
          <BrandingForm
            marca={marca}
            campos={[]}
            ranuras={[paso === "logo" ? "logo" : "favicon"]}
            onCambio={onCambio}
            onImagenSubida={onImagenSubida}
          />
        </>
      );

    case "appearance":
      return (
        <div className="alta__doble">
          <BrandingForm
            marca={marca}
            campos={["brandHue", "brandChroma"]}
            onCambio={onCambio}
          />
          <BrandingPreview marca={marca} titulo="Así se verá" />
        </div>
      );

    case "support":
      return (
        <>
          <p className="alta__texto">
            A dónde acuden tus clientes cuando necesitan ayuda. Estos datos los
            verán ellos.
          </p>
          <BrandingForm
            marca={marca}
            campos={["supportEmail", "supportPhone", "supportUrl", "loginTagline"]}
            onCambio={onCambio}
          />
        </>
      );

    case "review":
      return (
        <div className="alta__doble">
          <dl className="alta__datos">
            <Dato etiqueta="Nombre" valor={marca.platformName} />
            <Dato etiqueta="Frase" valor={marca.loginTagline} />
            <Dato etiqueta="Correo de soporte" valor={marca.supportEmail} />
            <Dato etiqueta="Teléfono" valor={marca.supportPhone} />
            <Dato etiqueta="Web de soporte" valor={marca.supportUrl} />
            <Dato etiqueta="Logotipo" valor={marca.logoFileId ? "Cargado" : "Sin subir"} />
            <Dato etiqueta="Icono" valor={marca.faviconFileId ? "Cargado" : "Sin subir"} />
          </dl>
          <BrandingPreview marca={marca} titulo="Así lo verán" />
        </div>
      );

    case "publish":
      return (
        <div className="alta__texto">
          <p>Todo listo. Al publicar, tus clientes empezarán a ver tu marca.</p>
          <p className="alta__apunte">
            Podrás cambiarla cuando quieras desde «Tu marca»: se edita en un
            borrador y no se aplica hasta que vuelvas a publicar.
          </p>
        </div>
      );

    default:
      return null;
  }
}

export default Wizard;
