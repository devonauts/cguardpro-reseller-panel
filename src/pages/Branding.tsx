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

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await brandingService.obtener();
      setBorrador(r.draft);
      setPublicado(r.published);
    } catch (e: any) {
      setError(e?.message || t("marca.noCargo"));
    } finally {
      setCargando(false);
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

  const guardar = async () => {
    const cambios = pendiente.current;
    if (!Object.keys(cambios).length) return;
    pendiente.current = {};
    setGuardando(true);
    setError(null);
    try {
      const fresco = await brandingService.guardar(cambios);
      setBorrador(fresco);
    } catch (e: any) {
      // El servidor dice qué campo está mal; se enseña tal cual y se recarga
      // para que la pantalla no siga enseñando algo que no se ha guardado.
      setError(e?.message || t("marca.noGuardo"));
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const publicar = async () => {
    clearTimeout(temporizador.current);
    await guardar();
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

      <EstadoDeDatos cargando={cargando} error={error && !borrador ? error : null} onReintentar={cargar}>
        {borrador && (
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
                  ranuras={["logo", "favicon", "emailLogo"]}
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
              <BrandingPreview
                marca={borrador}
                nota={t("marca.previaNota")}
              />
            </div>
          </div>
        )}
      </EstadoDeDatos>
    </div>
  );
}

export default Branding;
