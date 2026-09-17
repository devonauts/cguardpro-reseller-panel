import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";

import {
  alCambiarIdioma, elegirIdioma, idioma, t as traducir, type Clave, type Idioma,
} from "./idioma";

/**
 * El puente entre la tienda de idioma y React.
 *
 * No GUARDA el idioma —eso vive en `idioma.ts`—: sólo se suscribe a sus cambios
 * y repinta. Así, cambiar de idioma es un `setState` y nada más: no se recarga
 * la página, no se vuelve a pedir `/me` y la sesión no se toca.
 */

interface Contexto {
  idioma: Idioma;
  t: (clave: Clave, valores?: Record<string, string | number>) => string;
  elegir: (i: Idioma) => void;
}

const Ctx = createContext<Contexto | null>(null);

export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [actual, setActual] = useState<Idioma>(idioma);

  useEffect(() => alCambiarIdioma(setActual), []);

  /* `actual` entra en las dependencias aunque no se lea: es lo que obliga a
     rehacer la función y, con ella, a repintar a quien la usa. Sin eso React
     reutilizaría la anterior y las pantallas se quedarían en el idioma viejo. */
  const t = useCallback(
    (clave: Clave, valores?: Record<string, string | number>) => traducir(clave, valores),
    [actual],
  );

  const valor = useMemo<Contexto>(
    () => ({ idioma: actual, t, elegir: elegirIdioma }),
    [actual, t],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useIdioma(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIdioma fuera de IdiomaProvider");
  return c;
}

/** El atajo de cada pantalla: `const t = useT();`. */
export function useT() {
  return useIdioma().t;
}
