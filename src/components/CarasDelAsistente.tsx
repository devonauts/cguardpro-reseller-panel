import { useState } from "react";
import { useT } from "@/i18n/IdiomaProvider";
import { brandingService, type Marca } from "@/services/resellerService";

/**
 * Ready-made faces for the assistant. Choosing one renders it to a PNG and
 * uploads it exactly like a custom image (the `agentAvatar` slot), so the CRM,
 * which already shows that image, needs nothing new. None uses our shield.
 * White glyphs on the partner's colour, 24×24 viewBox.
 */
const CARAS: Array<{ id: string; glifo: string }> = [
  { id: "robot", glifo: '<rect x="6" y="8" width="12" height="10" rx="3"/><circle cx="10" cy="13" r="1.4" fill="currentColor" stroke="none"/><circle cx="14" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M12 8V5M12 4.5h.01M9.5 16h5"/>' },
  { id: "operadora", glifo: '<circle cx="12" cy="10" r="4"/><path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5M6.5 11V9.5a5.5 5.5 0 0 1 11 0V11M17.5 11v2a2 2 0 0 1-2 2H13"/>' },
  { id: "buho", glifo: '<path d="M6 7l2 2.5M18 7l-2 2.5"/><path d="M6 9.5c0-2 2.7-3.5 6-3.5s6 1.5 6 3.5V15a6 6 0 0 1-12 0z"/><circle cx="9.5" cy="12" r="1.8"/><circle cx="14.5" cy="12" r="1.8"/><path d="M11.2 15l.8 1 .8-1"/>' },
  { id: "chispa", glifo: '<path d="M12 4c.8 3.6 2.4 5.2 6 6-3.6.8-5.2 2.4-6 6-.8-3.6-2.4-5.2-6-6 3.6-.8 5.2-2.4 6-6z"/><path d="M18.5 16.5c.3 1.2.8 1.7 2 2-1.2.3-1.7.8-2 2-.3-1.2-.8-1.7-2-2 1.2-.3 1.7-.8 2-2z"/>' },
  { id: "rayo", glifo: '<path d="M13 3L6 13.5h5L10 21l7-10.5h-5z"/>' },
  { id: "radio", glifo: '<rect x="7" y="8" width="10" height="13" rx="2"/><path d="M9 8V3M10 12h4M10 15h4"/><circle cx="12" cy="18" r=".6" fill="currentColor" stroke="none"/>' },
  { id: "ojo", glifo: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="3"/>' },
  { id: "brujula", glifo: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>' },
  { id: "chat", glifo: '<path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>' },
  { id: "estrella", glifo: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>' },
  { id: "casco", glifo: '<path d="M4 16h16M5.5 16a6.5 6.5 0 0 1 13 0"/><path d="M12 9.5V7M9 10.5l-1-2M15 10.5l1-2"/><path d="M4 16v2h16v-2"/>' },
  { id: "mano", glifo: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v6.5c0 4-2.5 6.5-6 6.5-2.8 0-4.3-1.4-5.8-3.8L4 13.5a1.5 1.5 0 0 1 2.4-1.8L8 13.5"/>' },
];

function svgDe(glifo: string, fondo: string, tamano = 256): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamano}" height="${tamano}" viewBox="0 0 24 24">`
    + `<rect width="24" height="24" rx="12" fill="${fondo}"/>`
    + `<g transform="translate(4.2 4.2) scale(.65)" fill="none" stroke="#fff" color="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glifo}</g></svg>`;
}

/** The partner's colour as rgb(): an SVG drawn into a canvas may not read oklch. */
function aRgb(color: string): string {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${g},${b})`;
  } catch {
    return "#2563eb";
  }
}

async function aPng(svg: string): Promise<File> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  c.getContext("2d")!.drawImage(img, 0, 0, 256, 256);
  const blob: Blob = await new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("png"))), "image/png"));
  return new File([blob], "cara-del-asistente.png", { type: "image/png" });
}

export function CarasDelAsistente({ color, onSubida, deshabilitado }: {
  color: string;
  onSubida: (m: Marca) => void;
  deshabilitado?: boolean;
}) {
  const t = useT();
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegir = async (id: string, glifo: string) => {
    if (eligiendo || deshabilitado) return;
    setEligiendo(id);
    setError(null);
    try {
      const archivo = await aPng(svgDe(glifo, aRgb(color)));
      const r = await brandingService.subirImagen("agentAvatar", archivo);
      onSubida(r.draft);
      setElegida(id);
    } catch (e: any) {
      setError(e?.message || t("asistente.caraNoSubio"));
    } finally {
      setEligiendo(null);
    }
  };

  return (
    <div className="caras">
      <p className="caras__titulo">{t("asistente.carasTitulo")}</p>
      <p className="caras__ayuda">{t("asistente.carasAyuda")}</p>
      <div className="caras__rejilla" role="listbox" aria-label={t("asistente.carasTitulo")}>
        {CARAS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={elegida === c.id}
            className={`caras__opcion${elegida === c.id ? " caras__opcion--elegida" : ""}`}
            disabled={!!eligiendo || deshabilitado}
            onClick={() => elegir(c.id, c.glifo)}
            title={t(`asistente.cara.${c.id}` as any)}
          >
            <span
              className="caras__muestra"
              style={{ background: color }}
              dangerouslySetInnerHTML={{
                __html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" color="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${c.glifo}</svg>`,
              }}
            />
            <span className="caras__nombre">{eligiendo === c.id ? "…" : t(`asistente.cara.${c.id}` as any)}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="marca__error">{error}</p>}
    </div>
  );
}

export default CarasDelAsistente;
