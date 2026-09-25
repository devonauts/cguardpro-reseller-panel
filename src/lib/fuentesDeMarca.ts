/**
 * The typefaces a partner can choose. The SAME keys as the backend
 * (`services/reseller/fuentesDeMarca.ts`) and the CRM (`lib/fuentesDeMarca.ts`);
 * `null` is the platform's own typeface.
 */
export const FUENTES_DE_MARCA: Array<{ clave: string; familia: string }> = [
  { clave: "inter", familia: "Inter" },
  { clave: "poppins", familia: "Poppins" },
  { clave: "montserrat", familia: "Montserrat" },
  { clave: "roboto", familia: "Roboto" },
  { clave: "open-sans", familia: "Open Sans" },
  { clave: "lato", familia: "Lato" },
  { clave: "nunito", familia: "Nunito" },
  { clave: "dm-sans", familia: "DM Sans" },
  { clave: "manrope", familia: "Manrope" },
  { clave: "work-sans", familia: "Work Sans" },
  { clave: "raleway", familia: "Raleway" },
  { clave: "ibm-plex-sans", familia: "IBM Plex Sans" },
  { clave: "source-serif-4", familia: "Source Serif 4" },
  { clave: "merriweather", familia: "Merriweather" },
];

const ID = "fuentes-de-marca-muestra";

/** Load every family once, so each option can be shown in its own letter. */
export function cargarMuestrasDeFuentes(): void {
  if (typeof document === "undefined" || document.getElementById(ID)) return;
  const familias = FUENTES_DE_MARCA
    .map((f) => `family=${encodeURIComponent(f.familia).replace(/%20/g, "+")}:wght@500`)
    .join("&");
  const l = document.createElement("link");
  l.id = ID;
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?${familias}&display=swap`;
  document.head.appendChild(l);
}
