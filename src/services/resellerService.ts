import { del, get, patch, post, subirArchivo } from "@/services/api";

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
  /**
   * La marca PUBLICADA del socio, para que el panel se vista solo.
   *
   * Viene en `/me` y no en `/branding` por dos razones: `/branding` exige el
   * permiso de gestionarla —y ver el panel con tu propia marca no es
   * administrarla—, y `/me` ya se pide antes de pintar nada, así que no hay un
   * primer fotograma con la identidad equivocada.
   */
  branding?: MarcaParaPintar | null;
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
  logoDarkFileId: string | null;
  markFileId: string | null;
  markDarkFileId: string | null;
  faviconFileId: string | null;
  emailLogoFileId: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  /** Cada ranura con su enlace ya firmado por el servidor, listo para un `<img>`. */
  assets?: Record<RanuraDeImagen, { fileId: string | null; url: string | null }>;
}

/**
 * Las seis ranuras del juego de marca.
 *
 * Eran tres —logotipo, icono y logotipo de correo— y no alcanzaban: el producto
 * se sirve en claro y en oscuro, y un logotipo con letra oscura no se lee sobre
 * una barra negra. Invertirlo por CSS no es una solución: rota toda la paleta y
 * convierte un rojo corporativo en cian. Y faltaba la marca COMPACTA, que es lo
 * que necesita una barra plegada, un avatar o una pestaña del navegador —
 * encoger el logotipo completo a 32 px da una mancha.
 *
 * Tiene que coincidir con `RANURAS` del backend.
 */
export const RANURAS_DE_IMAGEN = [
  "logo", "logoDark", "mark", "markDark", "favicon", "emailLogo",
] as const;
export type RanuraDeImagen = (typeof RANURAS_DE_IMAGEN)[number];

/** Lo que se PINTA, ya elegido por el servidor con su jerarquía de respaldo. */
export interface ActivosResueltos {
  fullLight: string | null;
  fullDark: string | null;
  markLight: string | null;
  markDark: string | null;
  favicon: string | null;
  email: string | null;
}

/** La marca publicada tal y como llega en `/me`, lista para vestir el panel. */
export interface MarcaParaPintar {
  platformName: string | null;
  loginTagline: string | null;
  brandHue: number | null;
  brandChroma: number | null;
  supportEmail: string | null;
  supportUrl: string | null;
  supportPhone: string | null;
  publishedAt: string | null;
  /** Enlaces ya resueltos. `null` = esa superficie no tiene imagen. */
  assets: ActivosResueltos;
}

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

export interface RespuestaDeMarca {
  draft: Marca;
  published: Marca | null;
  hasUnpublishedChanges: boolean;
  slots: RanuraDeImagen[];
  limits: Record<RanuraDeImagen, { w: number; h: number }>;
  maxBytes: number;
  resolvedDraft: Record<string, string | null>;
  resolvedPublished: Record<string, string | null>;
}

export const brandingService = {
  obtener: () => get<RespuestaDeMarca>("/reseller/branding"),
  guardar: (data: MarcaEditable) => patch<Marca>("/reseller/branding", data),
  publicar: () => post<Marca>("/reseller/branding/publish", {}),
  /** Sube una imagen. El servidor la decodifica y la vuelve a escribir: lo que
   *  acabe sirviéndose no son nunca los bytes que salen de este navegador. */
  subirImagen: (ranura: RanuraDeImagen, archivo: File) =>
    subirArchivo<{ slot: RanuraDeImagen; fileId: string; draft: Marca }>(
      `/reseller/branding/assets/${ranura}`,
      archivo,
    ),
  /** Quita la imagen del BORRADOR. Lo publicado no cambia hasta publicar. */
  quitarImagen: (ranura: RanuraDeImagen) =>
    del<{ slot: RanuraDeImagen; draft: Marca }>(
      `/reseller/branding/assets/${ranura}`,
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

/* ══════════════════════════════════════════════════════════════════════════
   LAS EMPRESAS DEL SOCIO (fase 8)
   ══════════════════════════════════════════════════════════════════════════ */

/** Lo que el socio ve de SU empresa. Sólo comercial: ni facturación de
 *  CGuardPro, ni Stripe, ni prueba, ni nada operativo. */
export interface Empresa {
  id: string;
  name: string | null;
  businessTitle: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  timezone: string | null;
  taxNumber: string | null;
  /** Administrativa, de la plataforma. Se LEE; no se puede cambiar desde aquí. */
  suspendedAt: string | null;
  onboardingCompleted: boolean;
  createdAt: string | null;
}

export interface Cupo {
  used: number;
  /** `null` = sin límite. Nunca 0 por «ilimitado»: eso sería mentir. */
  max: number | null;
  remaining: number | null;
  unlimited: boolean;
  canCreate: boolean;
}

/** Lo que el formulario manda. Lista explícita: el servidor ignora el resto. */
export interface AltaDeEmpresa {
  name: string;
  businessTitle?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  timezone?: string;
  taxNumber?: string;
  owner: { email: string; firstName?: string; lastName?: string };
}

export type FichaDeEmpresa = Omit<AltaDeEmpresa, "owner" | "name"> & { name?: string };

export const companiesService = {
  list: (params: { page?: number; limit?: number; search?: string } = {}) =>
    get<{ rows: Empresa[]; count: number; quota: Cupo }>("/reseller/companies", params),
  detail: (tenantId: string) => get<Empresa>(`/reseller/companies/${tenantId}`),
  create: (data: AltaDeEmpresa) =>
    post<{ company: Empresa; quota: { used: number; max: number | null };
           ownerInvited: boolean; ignoredFields: string[] }>(
      "/reseller/companies", data,
    ),
  update: (tenantId: string, data: FichaDeEmpresa) =>
    patch<{ company: Empresa; changed: string[]; ignoredFields: string[] }>(
      `/reseller/companies/${tenantId}`, data,
    ),
};

/* ══════════════════════════════════════════════════════════════════════════
   EL CONSUMO CONTADO (fase 9)
   ══════════════════════════════════════════════════════════════════════════ */

/** Por qué el número es menor que la lista de usuarios de la empresa. */
export interface Exclusiones {
  invited?: number;
  pending?: number;
  archived?: number;
  deletedMembership?: number;
  orphanUser?: number;
  demoSeed?: number;
  policy?: number;
  [otro: string]: number | undefined;
}

export interface UsoDeEmpresa {
  tenantId: string;
  /** El nombre CONGELADO al cerrar: sobrevive al renombrado y al borrado. */
  tenantName: string | null;
  royaltySeats: number;
  sourceMemberships: number | null;
  excluded: Exclusiones;
  excludedTotal: number;
  seatPolicy: string;
  methodVersion: string;
  countedAt: string | null;
}

export interface PeriodoDeUso {
  periodId: string;
  period: { start: string; end: string; label: string };
  status: string;
  currency: string;
  seatPolicy: string;
  contractId: string;
  snapshotTakenAt: string | null;
  totalRoyaltySeats: number;
  tenants: UsoDeEmpresa[];
}

export const usageService = {
  /** Sólo periodos CERRADOS. No hay estimación del mes en curso. */
  list: (params: { period?: string; limit?: number } = {}) =>
    get<{ source: "snapshot"; currency: string | null; periods: PeriodoDeUso[] }>(
      "/reseller/usage", params,
    ),
};

/* ── Fase 10 · facturación (SÓLO LECTURA) ─────────────────────────────────
   Aquí no hay ni una función que escriba, y es deliberado: una factura es una
   reclamación de CGuardPro sobre el socio, y la parte a la que se le reclama no
   puede editarla — si pudiera, el documento no serviría de respaldo. Ajustar,
   cerrar, anular y marcar cobrada viven sólo en el panel de superadmin. */

export interface LineaDeFactura {
  id: string;
  kind: "setup_fee" | "monthly_subscription" | "royalty" | "adjustment" | "credit" | "tax";
  description: string | null;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
  tenantId: string | null;
  /** El enlace al recuento del que salió el importe. */
  snapshotId: string | null;
  tenantNameAtSnapshot: string | null;
  seatPolicy: string | null;
  methodVersion: string | null;
  excluded: Record<string, number> | null;
  sourceMemberships: number | null;
  isAdjustment: boolean;
}

export interface FacturaEnLista {
  id: string;
  number: string;
  status: string;
  currency: string;
  periodLabel: string | null;
  subtotalCents: number;
  adjustmentsCents: number;
  totalCents: number;
  amountPaidCents: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  finalizedAt: string | null;
  immutable: boolean;
}

export interface FacturaDetallada extends FacturaEnLista {
  period: { start: string; end: string; label: string } | null;
  contract: {
    id: string; version: number; currency: string;
    setupFeeCents: number; setupFeeWaived: boolean;
    monthlyFeeCents: number; royaltyPerUserCents: number; seatPolicy: string;
  } | null;
  lines: LineaDeFactura[];
  computedTotalCents: number;
  totalsMatch: boolean;
}

export interface TerminosVigentes {
  version: number;
  currency: string;
  monthlyFeeCents: number;
  royaltyPerUserCents: number;
  seatPolicy: string;
  setupFeeCents: number;
  setupFeeWaived: boolean;
  effectiveFrom: string;
}

export interface TotalPorMoneda {
  currency: string;
  invoiceCount: number;
  billedCents: number;
  paidCents: number;
  outstandingCents: number;
}

export const billingService = {
  list: (params: { limit?: number } = {}) =>
    get<{
      contract: TerminosVigentes | null;
      invoices: FacturaEnLista[];
      /** Por moneda. Nunca una sola cifra: no hay conversión de divisa. */
      totalsByCurrency: TotalPorMoneda[];
    }>("/reseller/billing", params),

  detail: (invoiceId: string) =>
    get<FacturaDetallada>(`/reseller/billing/invoices/${invoiceId}`),

  /** La dirección del PDF. Se abre; no se descarga por JavaScript. */
  pdfUrl: (invoiceId: string) =>
    `/api/reseller/billing/invoices/${invoiceId}/pdf`,
};
