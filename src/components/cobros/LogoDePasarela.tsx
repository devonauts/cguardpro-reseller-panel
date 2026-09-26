import { etiquetaIntl } from "@/i18n/idioma";
import "./LogoDePasarela.scss";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * A GATEWAY'S BRAND
 *
 * The partner has to recognise at a glance the company that will hold their
 * money: Stripe's mark on Stripe's purple, not a card icon and a row of flag
 * emojis (which Windows draws as bare letters). Only brand facts live here —
 * mark, colour, where the keys are and what they look like. What the gateway
 * can do comes from the server's catalogue.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface MarcaDePasarela {
  /** Brand colour behind the mark. */
  color: string;
  /** SVG path of the mark, on a 24×24 box, drawn in white. */
  trazo?: string;
  /** The gateway's own dashboard (live mode). */
  panel?: string;
  /** Same dashboard in test mode, when it has its own address. */
  panelDePrueba?: string;
  /** Where the API keys are. */
  claves?: string;
  /** What each credential starts with, to catch a key pasted in the wrong box. */
  prefijos?: Record<string, string[]>;
  /** Credential prefix that means test mode. */
  prefijoDePrueba?: string;
}

/* Stripe's "S" mark (Simple Icons, CC0). Used to identify the gateway the
   partner connects, as Stripe's brand guidelines allow. */
const TRAZO_STRIPE =
  "M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z";

const MARCAS: Record<string, MarcaDePasarela> = {
  stripe: {
    color: "#635BFF",
    trazo: TRAZO_STRIPE,
    panel: "https://dashboard.stripe.com",
    panelDePrueba: "https://dashboard.stripe.com/test",
    claves: "https://dashboard.stripe.com/apikeys",
    prefijos: { publishableKey: ["pk_"], secretKey: ["sk_", "rk_"] },
    prefijoDePrueba: "_test_",
  },
  mercadopago: { color: "#00B1EA" },
  kushki: { color: "#00B67A" },
  tilopay: { color: "#1E3A8A" },
  payphone: { color: "#FF6B00" },
  paguelofacil: { color: "#0F766E" },
};

export function marcaDePasarela(provider: string): MarcaDePasarela {
  return MARCAS[provider] ?? { color: "#475569" };
}

/** The mark on its brand colour; without a mark, the name's initial. */
export function LogoDePasarela({ provider, nombre, tamano = 40 }: { provider: string; nombre: string; tamano?: number }) {
  const marca = marcaDePasarela(provider);
  return (
    <span
      className="logo-pasarela"
      style={{ width: tamano, height: tamano, background: marca.color, borderRadius: Math.round(tamano * 0.24) }}
      // Always next to the written name, so the mark itself stays silent.
      aria-hidden="true"
    >
      {marca.trazo ? (
        <svg viewBox="0 0 24 24" width={Math.round(tamano * 0.5)} height={Math.round(tamano * 0.5)} aria-hidden="true">
          <path d={marca.trazo} fill="#fff" />
        </svg>
      ) : (
        <span className="logo-pasarela__inicial" style={{ fontSize: Math.round(tamano * 0.45), color: "#fff" }}>
          {nombre.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** ["US", "MX"] → «Estados Unidos y México» in the panel's language. */
export function nombresDePaises(codigos: string[]): string {
  let nombres = codigos;
  try {
    const dn = new Intl.DisplayNames([etiquetaIntl()], { type: "region" });
    nombres = codigos.map((c) => dn.of(c) ?? c);
  } catch { /* old browsers: the codes */ }
  try {
    // ListFormat is in every browser the panel supports; the lib target predates it.
    const ListFormat = (Intl as any).ListFormat;
    return new ListFormat(etiquetaIntl(), { style: "long", type: "conjunction" }).format(nombres);
  } catch {
    return nombres.join(", ");
  }
}
