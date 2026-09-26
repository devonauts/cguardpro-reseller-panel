import { useCallback, useEffect, useRef, useState } from "react";
import { brandingService, type Marca, type MarcaEditable } from "@/services/resellerService";
import { useT } from "@/i18n/IdiomaProvider";

/** Fields of the brand screen and of the assistant screen (published together). */
export const CAMPOS_DE_MARCA: Array<keyof Marca> = [
  "platformName", "brandHue", "brandChroma", "fontFamily", "loginTagline",
  "supportEmail", "supportUrl", "supportPhone",
  "logoFileId", "logoDarkFileId", "faviconFileId", "emailLogoFileId",
];
export const CAMPOS_DEL_ASISTENTE: Array<keyof Marca> = [
  "agentName", "agentTone", "agentShape", "agentIcon", "agentGreeting", "agentAvatarFileId",
];

/** Do draft and published differ in any of these fields? */
export function hayCambios(
  borrador: Marca | null, publicado: Marca | null, campos: Array<keyof Marca>,
): boolean {
  if (!borrador) return false;
  if (!publicado) return true;
  return campos.some((c) => (borrador[c] ?? null) !== (publicado[c] ?? null));
}

/**
 * The brand draft: load, auto-save (debounced) and publish.
 *
 * Shared by the brand screen and the assistant screen: both edit the SAME
 * draft and publish it in one transaction on the server, so they must behave
 * the same way (and a half-published brand is impossible either way).
 */
export function useBorradorDeMarca() {
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

  /* What is typed shows at once but is SENT with a delay: a colour slider
     would otherwise fire a request per pixel. */
  const pendiente = useRef<MarcaEditable>({});
  const temporizador = useRef<ReturnType<typeof setTimeout>>();

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
      // keep the server's message on screen.
      await cargar(true);
      setError(e?.message || t("marca.noGuardo"));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const cambiar = (parcial: MarcaEditable) => {
    setBorrador((b) => (b ? { ...b, ...parcial } as Marca : b));
    pendiente.current = { ...pendiente.current, ...parcial };
    setAviso(null);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => { void guardar(); }, 700);
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

  return {
    borrador, publicado, cargando, error, aviso, guardando, publicando,
    cargar, cambiar, publicar, setBorrador,
  };
}
