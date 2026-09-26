/**
 * LOS TEXTOS DE LA PROPIA TIENDA, EN EL IDIOMA DE LA FICHA
 *
 * «Obtener», «Instalar», «más»… no son textos del panel: son los de la App
 * Store y Google Play, y en la vista previa tienen que salir en el idioma de
 * la ficha que se está mirando, sea cual sea el idioma del panel. Por eso no
 * van en `en.ts`/`es.ts` (que siguen al panel) sino aquí, uno por idioma de
 * ficha. Ver `pages/apps/VistaPrevia.tsx`.
 */
export type IdiomaDeTienda = "es" | "en";
export type TextoDeTienda =
  | "get" | "install" | "more" | "about" | "nuevo" | "edad"
  | "edadEtiqueta" | "categoriaEtiqueta" | "contains";

export const TEXTOS_DE_TIENDA: Record<IdiomaDeTienda, Record<TextoDeTienda, string>> = {
  es: {
    get: "Obtener", install: "Instalar", more: "más", about: "Acerca de esta app",
    nuevo: "Nuevo", edad: "4+", edadEtiqueta: "Edad", categoriaEtiqueta: "Categoría", contains: "Sin anuncios",
  },
  en: {
    get: "Get", install: "Install", more: "more", about: "About this app",
    nuevo: "New", edad: "4+", edadEtiqueta: "Age", categoriaEtiqueta: "Category", contains: "No ads",
  },
};
