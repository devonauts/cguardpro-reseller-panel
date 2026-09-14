import { get, patch, post, subirArchivo } from "@/services/api";

/** Lo que `/api/reseller/me` contesta. */
export interface ResellerMe {
  reseller: {
    id: string;
    publicId: string | null;
    displayName: string | null;
    legalName: string | null;
    slug: string | null;
    country: string | null;
    status: string | null;
    statusReason: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    billingEmail: string | null;
    showPlatformAttribution: boolean;
  };
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
  };
  membership: { role: string | null; status: string | null };
  /** Permisos EFECTIVOS. Sirven para esconder, nunca para autorizar: cada ruta
   *  del servidor vuelve a comprobarlos. */
  permissions: string[];
}

export interface ResellerDashboard {
  account: {
    status: string | null;
    statusReason: string | null;
    displayName: string | null;
    publicId: string | null;
  };
  companies: {
    total: number;
    active: number;
    remainingQuota: number | null;
    resellerBilled: number;
  };
  contract: {
    version: number;
    effectiveFrom: string;
    currency: string;
    monthlyFeeCents: number;
    royaltyPerUserCents: number;
  } | null;
  usage: {
    /** `true` mientras no exista el motor de regalías. La pantalla lo DICE en
     *  vez de enseñar un importe que nadie ha calculado. */
    notYetCalculated: boolean;
    periodStart: string | null;
    periodEnd: string | null;
  };
}

export interface SignInResult {
  token: string;
  user: any;
}

export const resellerService = {
  /**
   * Entrar. `app: 'reseller'` es lo que le dice al backend qué canal emitir; sin
   * eso devolvería una sesión de CRM, que aquí no vale para nada.
   *
   * No hay una segunda API de autenticación: es la misma de siempre.
   */
  signIn: (email: string, password: string) =>
    post<SignInResult>("/auth/sign-in", { email, password, app: "reseller" }),

  me: () => get<ResellerMe>("/reseller/me"),
  dashboard: () => get<ResellerDashboard>("/reseller/dashboard"),
};

export default resellerService;

/* ══════════════════════════════════════════════════════════════════════════
   LA MARCA
   ══════════════════════════════════════════════════════════════════════════ */

export interface Marca {
  state: "draft" | "published";
  platformName: string | null;
  brandHue: number | null;
  brandChroma: number | null;
  loginTagline: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
  supportPhone: string | null;
  logoFileId: string | null;
  faviconFileId: string | null;
  emailLogoFileId: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export type RanuraDeImagen = "logo" | "favicon" | "emailLogo";

/** Lo editable. Sin CSS, sin JS, sin HTML: esos campos no existen. */
export interface MarcaEditable {
  platformName?: string | null;
  brandHue?: number | null;
  brandChroma?: number | null;
  loginTagline?: string | null;
  supportEmail?: string | null;
  supportUrl?: string | null;
  supportPhone?: string | null;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL ALTA
   ══════════════════════════════════════════════════════════════════════════ */

export type PasoDelAlta =
  | "welcome" | "identity" | "subdomain" | "platform_name" | "logo"
  | "favicon" | "appearance" | "support" | "review" | "publish";

export interface EstadoDelAlta {
  step: PasoDelAlta | "completed";
  stepIndex: number;
  totalSteps: number;
  completed: boolean;
  completedAt: string | null;
  steps: Array<{
    id: PasoDelAlta; index: number; done: boolean; current: boolean; fields: string[];
  }>;
  branding: Marca;
  platformHostname: string | null;
  platformHostnameActive: boolean;
  identity: {
    legalName: string | null;
    displayName: string | null;
    publicId: string | null;
    country: string | null;
  };
  requirement: string | null;
}

export const brandingService = {
  obtener: () => get<{ draft: Marca; published: Marca | null }>("/reseller/branding"),
  guardar: (data: MarcaEditable) => patch<Marca>("/reseller/branding", data),
  publicar: () => post<Marca>("/reseller/branding/publish", {}),
  /** Sube una imagen. El servidor la decodifica y la vuelve a escribir: lo que
   *  acabe sirviéndose no son nunca los bytes que salen de este navegador. */
  subirImagen: (ranura: RanuraDeImagen, archivo: File) =>
    subirArchivo<{ slot: RanuraDeImagen; fileId: string; draft: Marca }>(
      `/reseller/branding/assets/${ranura}`,
      archivo,
    ),
};

export const onboardingService = {
  estado: () => get<EstadoDelAlta>("/reseller/onboarding"),
  /** `step` es «de qué paso vengo», no «a dónde quiero ir»: el servidor lo
   *  contrasta con lo guardado antes de mover nada. */
  avanzar: (step: PasoDelAlta, datos: MarcaEditable = {}) =>
    post<EstadoDelAlta>("/reseller/onboarding/advance", { step, ...datos }),
  atras: (step: PasoDelAlta) =>
    post<EstadoDelAlta>("/reseller/onboarding/back", { step }),
  completar: () =>
    post<EstadoDelAlta & { published: boolean }>("/reseller/onboarding/complete", {}),
};
