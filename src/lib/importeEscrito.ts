/**
 * What a person types → integer cents, whatever punctuation they use.
 *
 * «1500», «1,500», «1.500», «1.500,50», «1,500.50», «12,5» and «12.50» all
 * read the way their writer meant. The old reader only swapped the first comma
 * for a point, so «1,500» in pesos saved 1.50 — and «1.500,00» nothing at all.
 * A lone separator followed by three digits is a thousands one: money never
 * has three decimals. Built on the text, never on a floating-point number.
 * Empty → null; unreadable → NaN.
 */
export function aCentavos(v: string): number | null {
  const s = String(v ?? "").trim().replace(/[\s\u00a0\u202f]/g, "").replace(/^[^\d.,]+|[^\d.,]+$/g, "");
  if (!s) return String(v ?? "").trim() ? NaN : null;
  if (!/^[\d.,]+$/.test(s)) return NaN;

  let entera = s;
  let decimales = "";
  const ultimoPunto = s.lastIndexOf(".");
  const ultimaComa = s.lastIndexOf(",");
  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    // Both present: the later one is the decimal mark, the other groups thousands.
    const d = Math.max(ultimoPunto, ultimaComa);
    entera = s.slice(0, d);
    decimales = s.slice(d + 1);
    if (/[.,]/.test(decimales)) return NaN;
  } else if (ultimoPunto >= 0 || ultimaComa >= 0) {
    const sep = ultimoPunto >= 0 ? "." : ",";
    const partes = s.split(sep);
    const cola = partes[partes.length - 1];
    if (partes.length === 2 && cola.length >= 1 && cola.length <= 2) {
      entera = partes[0];
      decimales = cola;
    } else if (partes.slice(1).every((g) => g.length === 3) && partes[0].length >= 1) {
      entera = partes.join("");
    } else {
      return NaN;
    }
  }
  // Thousand groups inside the whole part must be real groups of three.
  const gruposOk = !/[.,]/.test(entera) || entera.split(/[.,]/).slice(1).every((g) => g.length === 3);
  entera = entera.replace(/[.,]/g, "");
  if (!gruposOk || !/^\d+$/.test(entera) || !/^\d{0,2}$/.test(decimales)) return NaN;
  const n = Number(entera) * 100 + Number((decimales + "00").slice(0, 2));
  return Number.isSafeInteger(n) ? n : NaN;
}
