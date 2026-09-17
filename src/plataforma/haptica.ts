import { soloNativo } from "./plataforma";

/**
 * La háptica: un golpecito, y sólo cuando significa algo.
 *
 * ── CUÁNDO SÍ ────────────────────────────────────────────────────────────
 * Al copiar un valor de DNS (la confirmación visual es diminuta y el pulgar
 * tapa media pantalla), al terminar algo que tardó, y al confirmar algo que
 * destruye. Y ya.
 *
 * Vibrar en cada toque no informa de nada: si todo vibra, la vibración deja de
 * querer decir «ha pasado algo» y pasa a querer decir «has tocado la pantalla»,
 * que es lo que el dedo ya sabe. Además gasta batería y la gente lo apaga — y
 * entonces se pierden también los avisos que sí importaban.
 *
 * En web no hace nada: no es un fallo, es que no hay motor que mover.
 */

/** Confirmación breve: un valor copiado, un interruptor. */
export const toqueLeve = () =>
  soloNativo(async () => {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  });

/** Algo terminó: un dominio verificado, un alta completada. */
export const toqueExito = () =>
  soloNativo(async () => {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  });

/** Algo salió mal, o va a destruir algo. */
export const toqueAviso = () =>
  soloNativo(async () => {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  });
