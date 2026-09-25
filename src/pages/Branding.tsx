import { useCallback, useEffect, useRef, useState } from "react";
import BrandingForm from "@/components/BrandingForm";
import BrandingPreview from "@/components/BrandingPreview";
import { Boton, EstadoDeDatos, Tarjeta, TarjetaCabecera } from "@/components/cristal";
import { brandingService, type Marca, type MarcaEditable } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";
import "./Branding.scss";

/**
 * La pantalla de marca.
 *
 * ── DOS COSAS DISTINTAS, Y SE VE CUÁL ES CUÁL ─────────────────────────────
 * Lo que se edita es el BORRADOR. Lo que ven los clientes es lo PUBLICADO. Los
 * dos están a la vista a propósito: sin esa distinción, alguien cambia un color,
 * cierra la pestaña y se queda convencido de que ya está cambiado.
 *
 * El botón de publicar sólo se enciende cuando hay algo sin publicar.
 */

/** ¿Difieren en algo que se vaya a publicar? */
function hayCambios(borrador: Marca | null, publicado: Marca | null): boolean {
  if (!borrador) return false;
  if (!publicado) return true;
  const campos: Array<keyof Marca> = [
    "platformName", "brandHue", "brandChroma", "loginTagline",
    "supportEmail", "supportUrl", "supportPhone",
    "logoFileId", "faviconFileId", "emailLogoFileId",
    // The assistant is published with the brand: editing only it must still
    // light up Publish.
    "agentName", "agentTone", "agentGreeting", "agentAvatarFileId",
  ];
  return campos.some((c) => (borrador[c] ?? null) !== (publicado[c] ?? null));
}

export function Branding() {
  const t = useT();
  const [borrador, setBorrador] = useState<Marca | null>(null);
  const [publicado, setPublicado] = useState<Marca | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setCargando(true);
      setError(null);
    }
    try {
      const r = await brandingService.obtener();
      setBorrador(r.draft);
      setPublicado(r.published);
    } catch (e: any) {
      if (!silencioso) setError(e?.message || t("marca.noCargo"));
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  /* Lo que se teclea se ve al momento, pero se MANDA con retraso. Sin esto, un
     deslizador de color dispararía una petición por píxel movido. */
  const pendiente = useRef<MarcaEditable>({});
  const temporizador = useRef<ReturnType<typeof setTimeout>>();

  const cambiar = (parcial: MarcaEditable) => {
    setBorrador((b) => (b ? { ...b, ...parcial } as Marca : b));
    pendiente.current = { ...pendiente.current, ...parcial };
    setAviso(null);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => { void guardar(); }, 700);
  };

  /** `true` when there was nothing to save or it saved; `false` on failure. */
  const guardar = async (): Promise<boolean> => {
    const cambios = pendiente.current;
    if (!Object.keys(cambios).length) return true;
    pendiente.current = {};
    setGuardando(true);
    setError(null);
    try {
      const fresco = await brandingService.guardar(cambios);
      // Whatever was typed while this request was in flight wins over the
      // server's copy; it goes out with the next save.
      setBorrador({ ...fresco, ...pendiente.current } as Marca);
      return true;
    } catch (e: any) {
      // Reload quietly so the screen stops showing what did not save, and
      // keep the server's message on screen (a loud reload used to wipe it).
      await cargar(true);
      setError(e?.message || t("marca.noGuardo"));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  /* Leaving the page inside the 700 ms debounce used to drop the last edit. */
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  useEffect(() => () => {
    clearTimeout(temporizador.current);
    void guardarRef.current();
  }, []);

  const publicar = async () => {
    clearTimeout(temporizador.current);
    // A failed save must not publish the older draft and report success.
    if (!(await guardar())) return;
    setPublicando(true);
    setError(null);
    try {
      const fresco = await brandingService.publicar();
      setPublicado(fresco);
      setAviso(t("marca.publicado"));
    } catch (e: any) {
      setError(e?.message || t("marca.noPublico"));
    } finally {
      setPublicando(false);
    }
  };

  const sinPublicar = hayCambios(borrador, publicado);

  return (
    <div>
      <header className="cabecera">
        <div>
          <h1 className="cabecera__titulo">{t("marca.titulo")}</h1>
          <p className="cabecera__sub">{t("marca.sub")}</p>
        </div>
        <Boton
          onClick={publicar}
          cargando={publicando}
          disabled={!sinPublicar || cargando}
        >
          {t("marca.publicar")}
        </Boton>
      </header>

      <EstadoDeDatos cargando={cargando} error={error && !borrador ? error : null} onReintentar={() => cargar()}>
        {borrador && (
          <>
          {/* The login, big and full width: it is what customers will see. */}
          <div className="marca__previa">
            <BrandingPreview marca={borrador} nota={t("marca.previaNota")} />
          </div>
          <div className="marca">
            <div className="marca__columna">
              <Tarjeta>
                <TarjetaCabecera
                  titulo={t("marca.identidad")}
                  nota={t(sinPublicar ? "marca.sinPublicar" : "marca.todoPublicado")}
                />
                <BrandingForm
                  marca={borrador}
                  onCambio={cambiar}
                  /* La lista es OBLIGATORIA aquí, no un adorno: sin ella el
                     formulario pinta TODO lo editable, y al añadir los campos
                     del asistente salieron dos veces — una en esta tarjeta y
                     otra en la suya. Nombrar lo que entra hace que el próximo
                     campo nuevo aparezca sólo donde alguien lo ponga. */
                  campos={[
                    "platformName", "loginTagline", "brandHue", "brandChroma", "fontFamily",
                    "supportEmail", "supportPhone", "supportUrl",
                  ]}
                  ranuras={["logo", "logoDark", "favicon", "emailLogo"]}
                  onImagenSubida={setBorrador}
                  deshabilitado={publicando}
                />

                {/* Se dice lo que está pasando: «guardando» y los errores se
                    anuncian, no sólo se pintan. */}
                <p className="marca__estado" role="status" aria-live="polite">
                  {guardando ? t("marca.guardando") : aviso || ""}
                </p>
                {error && borrador && (
                  <p role="alert" className="marca__error">{error}</p>
                )}
              </Tarjeta>
            </div>

            <div className="marca__columna">
              {/* El asistente, en su propia tarjeta y no mezclado con el
                  logotipo: es lo único de esta pantalla que se CONVERSA, y
                  quien viene a cambiar un color no tiene por qué toparse con
                  ello. Se publica con todo lo demás, en la misma transacción —
                  publicar el logotipo nuevo dejando al asistente con el nombre
                  viejo sería media marca. */}
              <Tarjeta>
                <TarjetaCabecera
                  titulo={t("marca.asistente")}
                  nota={t("marca.asistenteSub")}
                />
                <BrandingForm
                  marca={borrador}
                  onCambio={cambiar}
                  campos={["agentName", "agentTone", "agentGreeting"]}
                  ranuras={["agentAvatar"]}
                  onImagenSubida={setBorrador}
                  deshabilitado={publicando}
                />
              </Tarjeta>
            </div>
          </div>
          </>
        )}
      </EstadoDeDatos>
    </div>
  );
}

export default Branding;
