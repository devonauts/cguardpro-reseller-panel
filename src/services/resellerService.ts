import { del, get, patch, post, put, subirArchivo } from "@/services/api";

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
  agentName: string | null;
  agentTone: string | null;
  agentGreeting: string | null;
  agentAvatarFileId: string | null;
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
 * Las ranuras del juego de marca.
 *
 * Eran tres —logotipo, icono y logotipo de correo— y no alcanzaban: el producto
 * se sirve en claro y en oscuro, y un logotipo con letra oscura no se lee sobre
 * una barra negra. Invertirlo por CSS no es una solución: rota toda la paleta y
 * convierte un rojo corporativo en cian. Y faltaba la marca COMPACTA, que es lo
 * que necesita una barra plegada, un avatar o una pestaña del navegador —
 * encoger el logotipo completo a 32 px da una mancha.
 *
 * Y la séptima es la CARA DEL ASISTENTE, que no es ninguna de las anteriores:
 * el logotipo de una empresa de seguridad no funciona como avatar de alguien
 * con quien se conversa.
 *
 * Tiene que coincidir con `RANURAS` del backend.
 */
export const RANURAS_DE_IMAGEN = [
  "logo", "logoDark", "mark", "markDark", "favicon", "emailLogo", "agentAvatar",
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
  agentName?: string | null;
  agentTone?: string | null;
  agentGreeting?: string | null;
}

/**
 * Los tonos del asistente. Lista CERRADA, y a propósito.
 *
 * Lo que se elija aquí acaba dentro del prompt de un agente que tiene
 * herramientas de escritura sobre los datos de los clientes del socio. Con tres
 * palabras, la frase que lee el modelo la redacta el servidor; con un campo
 * libre, la redactaría quien rellena el formulario — y «confirma siempre sin
 * preguntar» escrito ahí no es una preferencia de estilo.
 *
 * Tiene que coincidir con `RESELLER_AGENT_TONES` del backend.
 */
export const TONOS_DEL_AGENTE = ["cercano", "formal", "directo"] as const;
export type TonoDelAgente = (typeof TONOS_DEL_AGENTE)[number];

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

/* ══════════════════════════════════════════════════════════════════════════
   EL PORTAL — CONTRATO, DERECHOS, ACTIVIDAD Y CUENTA
   Las cuatro son de LECTURA. Ninguna manda un `resellerId`: el socio de la
   sesión lo resuelve el servidor desde el token firmado.
   ══════════════════════════════════════════════════════════════════════════ */

export interface ContratoDelSocio {
  version: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  currency: string;
  /** CENTAVOS ENTEROS. Se formatean para leer; nunca se reconstruyen. */
  setupFeeCents: number;
  setupFeeWaived: boolean;
  monthlyFeeCents: number;
  billingInterval: string;
  royaltyPerUserCents: number;
  royaltySeatPolicy: string | null;
}

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
}

export interface DerechosDelSocio {
  /** `true` = sin recorte: puede revender todo el catálogo. */
  grantedAll: boolean;
  /** Claves concedidas. Se comparan contra `catalog[].key`, NUNCA con el objeto. */
  granted: string[] | null;
  catalog: FeatureDef[];
  quota: {
    used: number;
    max: number | null;
    remaining: number | null;
    unlimited: boolean;
    canCreate: boolean;
  };
  showPlatformAttribution: boolean;
}

export interface LineaDeActividad {
  id: string;
  action: string;
  at: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string | null;
  statusCode: number | null;
  details: Record<string, unknown> | null;
}

export interface ActividadDelSocio {
  rows: LineaDeActividad[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CuentaDelSocio {
  account: {
    publicId: string | null;
    legalName: string | null;
    displayName: string | null;
    country: string | null;
    status: string | null;
    slug: string | null;
  };
  billing: { billingEmail: string | null };
  session: {
    email: string | null;
    fullName: string | null;
    role: string | null;
    membershipStatus: string | null;
  };
  editableElsewhere: Array<{ field: string; screen: string }>;
  platformControlled: string[];
}

/* ══════════════════════════════════════════════════════════════════════════
   EL EQUIPO
   ══════════════════════════════════════════════════════════════════════════ */

export interface MiembroDelEquipo {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  roleLabel: string | null;
  status: "active" | "invited" | "archived" | null;
  invitedAt: string | null;
  updatedAt: string | null;
  /** Si ya puso contraseña. Un booleano: nunca el estado del testigo. */
  hasPassword: boolean;
}

export interface EquipoDelSocio {
  members: MiembroDelEquipo[];
  /** Quién mira, para poder marcar «tú». La decisión sigue siendo del servidor. */
  me: { userId: string; role: string | null };
}

export interface RolDeSocio {
  id: string;
  label: string;
  description: string;
  /** Los permisos EFECTIVOS del rol, tal como los define el servidor. */
  permissions: string[];
}

export const teamService = {
  listar: () => get<EquipoDelSocio>("/reseller/team"),
  roles: () => get<{ roles: RolDeSocio[] }>("/reseller/team/roles"),
  invitar: (data: { email: string; role: string; firstName?: string; lastName?: string }) =>
    post<{
      member: MiembroDelEquipo;
      needsPasswordSetup: boolean;
      /** Si el correo con el enlace salió de verdad. Quien invita pregunta
       *  «¿le llegó?», y hasta que existió el correo nadie podía contestar. */
      invitationSent: boolean;
    }>("/reseller/team", data),
  cambiarRol: (membershipId: string, role: string) =>
    patch<{ member: MiembroDelEquipo }>(`/reseller/team/${membershipId}/role`, { role }),
  darDeBaja: (membershipId: string) =>
    post<{ member: MiembroDelEquipo }>(`/reseller/team/${membershipId}/deactivate`, {}),
  volverAInvitar: (membershipId: string) =>
    post<{ member: MiembroDelEquipo }>(`/reseller/team/${membershipId}/reinvite`, {}),
};

/**
 * Pedir el enlace para poner una contraseña nueva.
 *
 * ── ES EL ENDPOINT QUE YA EXISTE, NO UNO NUEVO ────────────────────────────
 * `/auth/send-password-reset-email` lleva años en pie y lo usa el CRM. Aquí no
 * se reimplementa nada de autenticación: se llama a lo que hay.
 *
 * NO se manda `tenantId`. Un socio no pertenece a ninguna empresa —esa es toda
 * la idea de la capa comercial—, y mandar uno inventado lo buscaría en el sitio
 * equivocado.
 *
 * El resultado se trata SIEMPRE igual, exista el correo o no: esta pantalla no
 * puede convertirse en un comprobador de qué cuentas existen.
 */
export const recuperacionService = {
  /**
   * `app: 'reseller'` NO es decorativo. Sin él, el servidor no sabía de qué
   * puerta venía la petición y armaba el enlace hacia `app.cguardpro.com` —el
   * CRM— o, si ese correo además era usuario de alguna empresa, hacia el
   * anfitrión de ESA empresa. Un socio que olvidaba su contraseña recibía un
   * enlace a una pantalla donde no tiene cuenta. Es el mismo parámetro y el
   * mismo motivo que en `signIn`.
   */
  pedirEnlace: (email: string) =>
    post<boolean>("/auth/send-password-reset-email", { email, app: "reseller" }),

  /** Poner la contraseña nueva con el testigo del correo. */
  restablecer: (token: string, password: string) =>
    put<boolean>("/auth/password-reset", { token, password }),
};

/* ══════════════════════════════════════════════════════════════════════════
   LA INVITACIÓN — ACTIVAR LA CUENTA

   Las dos ÚNICAS llamadas del panel que no llevan sesión, porque quien las hace
   todavía no puede tener una: acaba de recibir el correo y aún no tiene
   contraseña. El testigo del enlace es lo único que autoriza, y el servidor lo
   vuelve a comprobar en las dos.
   ══════════════════════════════════════════════════════════════════════════ */

export interface InvitacionDeSocio {
  /** El correo al que se mandó. Se enseña para no activar la cuenta ajena. */
  email: string | null;
  firstName: string | null;
  resellerName: string | null;
  role: string | null;
  /** `false` cuando esa persona ya tiene contraseña: entra con la suya. */
  needsPassword: boolean;
}

export const invitacionService = {
  ver: (token: string) =>
    get<{ invitation: InvitacionDeSocio }>(
      `/public/reseller-invitation/${encodeURIComponent(token)}`,
    ),

  aceptar: (token: string, password: string) =>
    post<{ accepted: boolean; email: string | null }>(
      `/public/reseller-invitation/${encodeURIComponent(token)}/accept`,
      { password },
    ),
};

export interface AnaliticaDelSocio {
  ga4MeasurementId: string | null;
  gtmContainerId: string | null;
}

/* ── LA MEDICIÓN ───────────────────────────────────────────────────────────
   Se guarda el IDENTIFICADOR, nunca una etiqueta ni un script: el `<script>`
   lo compone el CRM a partir de él. Lo contrario sería poder inyectar código
   en un anfitrión que sirve CGuardPro. */
export const analiticaService = {
  leer: () =>
    get<{ analytics: AnaliticaDelSocio; appliesTo: string | null }>("/reseller/analytics"),

  /** Cadena vacía en cualquiera de los dos lo BORRA. */
  guardar: (datos: AnaliticaDelSocio) =>
    patch<{ analytics: AnaliticaDelSocio }>("/reseller/analytics", datos),
};

export const portalService = {
  contrato: () => get<{ contract: ContratoDelSocio | null }>("/reseller/contract"),
  derechos: () => get<DerechosDelSocio>("/reseller/entitlements"),
  actividad: (page = 0, limit = 25) =>
    get<ActividadDelSocio>("/reseller/activity", { page, limit }),
  cuenta: () => get<CuentaDelSocio>("/reseller/settings"),
};

/* ══════════════════════════════════════════════════════════════════════════
   LA ACTIVACIÓN — el socio paga la cuota de alta para empezar
   ══════════════════════════════════════════════════════════════════════════ */

export interface EstadoDeActivacion {
  required: boolean;
  paid: boolean;
  paidAt: string | null;
  anchorDate: string | null;
  amountCents: number;
  currency: string;
  waived: boolean;
  hasContract: boolean;
  hasCard: boolean;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

export const activacionService = {
  estado: () => get<EstadoDeActivacion>("/reseller/billing/activation"),
  pagar: (opciones: { otraTarjeta?: boolean } = {}) =>
    post<PagoDeFactura>("/reseller/billing/activation/pay", opciones),
  confirmar: (paymentIntentId: string) =>
    post<PagoDeFactura>("/reseller/billing/activation/pay/confirm", { cargo: paymentIntentId }),
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
   QUIÉN ENTRA AL CRM DE CADA EMPRESA
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Una membresía: la persona Y su acceso a ESTA empresa.
 *
 * `id` es el de la MEMBRESÍA, no el de la persona. Es lo que se toca: la misma
 * persona puede llevar dos empresas, y quitarle el acceso en una no la borra
 * de la otra.
 */
export interface PersonaDeLaEmpresa {
  id: string;
  nombre: string;
  email: string;
  roles: string[];
  status: string;
  invitadaDesde: string | null;
  desde: string | null;
}

export interface PersonasDeLaEmpresa {
  conAcceso: PersonaDeLaEmpresa[];
  /** Vigilantes y supervisores: sólo cuántos. Nunca quiénes. */
  enCampo: number;
  /** Los roles que el panel deja conceder. Los decide el servidor. */
  rolesDisponibles: string[];
}

export const personasService = {
  list: (tenantId: string) =>
    get<PersonasDeLaEmpresa>(`/reseller/companies/${tenantId}/users`),

  invitar: (tenantId: string, data: {
    email: string; firstName?: string; lastName?: string; rol: string;
  }) => post<{ invited: string; rol: string }>(
    `/reseller/companies/${tenantId}/users`, data,
  ),

  cambiarRol: (tenantId: string, membershipId: string, rol: string) =>
    patch<{ membership: { id: string; roles: string[] } }>(
      `/reseller/companies/${tenantId}/users/${membershipId}`, { rol },
    ),

  /* Quitar el acceso ARCHIVA: no hay borrado, y no lo hay a propósito. Quien
     firmó turnos o reportó novedades deja un historial que no puede quedarse
     huérfano en el CRM de un cliente. */
  quitarAcceso: (tenantId: string, membershipId: string) =>
    post<{ membership: { id: string; status: string } }>(
      `/reseller/companies/${tenantId}/users/${membershipId}/revoke`, {},
    ),

  devolverAcceso: (tenantId: string, membershipId: string) =>
    post<{ membership: { id: string; status: string } }>(
      `/reseller/companies/${tenantId}/users/${membershipId}/restore`, {},
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

/** Lo que el panel sabe de la tarjeta. Nunca el número. */
export interface TarjetaDelSocio {
  hasCard: boolean;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  validatedAt: string | null;
  /** `true` cuando ya no se puede quitar, sólo sustituir. */
  locked: boolean;
}

/** El ciclo por aniversario: asientos prepagados de una renovación a la siguiente. */
export interface CicloDeCobro {
  start: string;
  end: string;
  anchorDay: number;
  seatsPaid: number;
  seatsNow: number;
  newSeats: number;
  proratedSeatCents: number;
  renewal: {
    seats: number;
    royaltyCents: number;
    monthlyFeeApplies: boolean;
    monthlyFeeCents: number;
    seatsToMonthlyFee: number;
    totalCents: number;
  };
  companies: Array<{
    tenantId: string; name: string | null; seats: number;
    excludedReason: string | null; trialEndsOn: string | null;
  }>;
}

/** «Cómo te cobramos»: condiciones, cuota de alta y el mes en curso. */
export interface PlanDeCobro {
  /** `aniversario`: asientos prepagados por ciclo. `mensual`: cierre de mes (socios de antes). */
  model?: "aniversario" | "mensual";
  cycle?: CicloDeCobro | null;
  contract: {
    version: number;
    effectiveFrom: string;
    currency: string;
    setupFeeCents: number;
    setupFeeWaived: boolean;
    monthlyFeeCents: number;
    /** Hasta cuántos usuarios NO se cobra la cuota mensual. 0 = desde el primero. */
    monthlyFeeFreeUntilSeats: number;
    royaltyPerUserCents: number;
    seatPolicy: string;
    paymentTermDays: number;
    gracePeriodDays: number;
  } | null;
  setupFee: {
    status: "sin_cuota" | "perdonada" | "pagada" | "facturada" | "proxima";
    amountCents: number;
    invoiceId: string | null;
    invoiceNumber: string | null;
    paidAt: string | null;
  };
  /** ESTIMACIÓN con los usuarios de hoy. La factura sale del último día del mes. */
  currentMonth: {
    estimate: true;
    billable: boolean;
    label: string;
    start: string;
    end: string;
    closesOn: string;
    seats: number;
    companies: Array<{ tenantId: string; name: string | null; seats: number; excludedReason: string | null }>;
    royaltyCents: number;
    monthlyFeeApplies: boolean;
    monthlyFeeCents: number;
    seatsToMonthlyFee: number;
    setupFeeCents: number;
    totalCents: number;
  } | null;
}

/** Lo que contesta el servidor al pagar. */
export interface PagoDeFactura {
  estado: "pagada" | "requiere_accion" | "requiere_tarjeta" | "rechazada";
  invoiceId: string;
  amountCents: number;
  currency: string;
  paymentIntentId?: string | null;
  clientSecret?: string | null;
  publishableKey?: string | null;
  motivo?: string;
  /** `true` cuando el pago sacó a la cuenta de la mora. */
  restablecido?: boolean;
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

  /** Cómo se le cobra al socio, explicado, y cómo va el mes en curso. */
  plan: () => get<PlanDeCobro>("/reseller/billing/plan"),

  /* ── LA TARJETA EN ARCHIVO ───────────────────────────────────────────────
     El número NUNCA pasa por aquí: lo recoge Stripe en su propio iframe y a
     nosotros nos vuelve una referencia (`pm_…`) que es la que se confirma. */

  tarjeta: () => get<{ card: TarjetaDelSocio }>("/reseller/billing/payment-method"),

  /** Abre el permiso para guardar una tarjeta. Devuelve lo que Stripe.js pide. */
  intentoDeGuardado: () =>
    post<{ clientSecret: string; customerId: string; publishableKey: string }>(
      "/reseller/billing/payment-method/setup-intent", {},
    ),

  confirmarTarjeta: (paymentMethodId: string) =>
    post<{ card: TarjetaDelSocio }>(
      "/reseller/billing/payment-method/confirm", { paymentMethodId },
    ),

  /** El servidor lo RECHAZA si la tarjeta ya fue validada. */
  quitarTarjeta: () => del<{ removed: boolean }>("/reseller/billing/payment-method"),

  /* ── PAGAR AHORA ─────────────────────────────────────────────────────────
     Ninguna de las dos manda un importe: cuánto se cobra lo decide el servidor
     a partir de la factura. Aquí sólo se dice CUÁL. */

  /** Intenta el cargo. Con tarjeta guardada, en el acto. */
  pagar: (invoiceId: string, opciones: { otraTarjeta?: boolean } = {}) =>
    post<PagoDeFactura>(`/reseller/billing/invoices/${invoiceId}/pay`, opciones),

  /** Tras terminar con Stripe en el navegador: el servidor lo comprueba allí. */
  confirmarPago: (invoiceId: string, paymentIntentId: string) =>
    /* El campo se llama `cargo` en el servidor: la ruta no nombra la pasarela.
       Mandar `paymentIntentId` aquí dejaba la confirmación sin identificador. */
    post<PagoDeFactura>(`/reseller/billing/invoices/${invoiceId}/pay/confirm`, { cargo: paymentIntentId }),

  /** La dirección del PDF. Se abre; no se descarga por JavaScript. */
  pdfUrl: (invoiceId: string) =>
    `/api/reseller/billing/invoices/${invoiceId}/pdf`,
};

/* ── FASE 16 · DOMINIOS ─────────────────────────────────────────────────── */

export interface InstruccionDeDns {
  tipo: "CNAME" | "TXT";
  nombre: string;
  valor: string;
  proposito: "enrutado" | "titularidad";
}

export type EstadoDeDominio =
  | "pendiente_dns" | "verificando" | "pendiente_tls"
  | "activo" | "mal_configurado" | "desactivado";

export interface DominioDelSocio {
  id: string;
  hostname: string | null;
  type: "platform_subdomain" | "custom" | null;
  isPrimary: boolean;
  isActive: boolean;
  verificationStatus: string | null;
  sslStatus: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  failureCount: number;
  lastFailureReason: string | null;
  estado: EstadoDeDominio;
  /** Sólo en el detalle: el registro que el socio tiene que crear. */
  instrucciones?: InstruccionDeDns[];
}

export interface DominiosDelSocio {
  dominios: DominioDelSocio[];
  destinoDeDns: string;
  proveedorListo: boolean;
  motivoProveedor: string | null;
  tope: number;
}

export const domainsService = {
  listar: () => get<DominiosDelSocio>("/reseller/domains"),
  ver: (id: string) => get<DominioDelSocio>(`/reseller/domains/${id}`),
  agregar: (hostname: string) =>
    post<DominioDelSocio>("/reseller/domains", { hostname }),
  comprobar: (id: string) => post<DominioDelSocio>(`/reseller/domains/${id}/check`, {}),
  hacerPrincipal: (id: string) => post<DominioDelSocio>(`/reseller/domains/${id}/primary`, {}),
  desactivar: (id: string) => post<DominioDelSocio>(`/reseller/domains/${id}/disable`, {}),
  quitar: (id: string) => del<{ removed: boolean; hostname: string }>(`/reseller/domains/${id}`),
};

/* ══════════════════════════════════════════════════════════════════════════
   FASE D — EL SOCIO COBRA A SUS EMPRESAS CON SU PROPIA PASARELA
   ══════════════════════════════════════════════════════════════════════════ */

export interface PasarelaDelCatalogo {
  provider: string;
  name: string;
  countries: string[];
  available: boolean;
  fields: Array<{ clave: string; etiqueta: string; secreto: boolean }>;
}

export interface PasarelaConectada {
  provider: string;
  name: string;
  mode: "test" | "live" | string;
  status: "pending" | "connected" | "error" | string;
  accountLabel: string | null;
  lastError: string | null;
  verifiedAt: string | null;
}

export interface PreciosAEmpresas {
  currency: string;
  setupFeeCents: number;
  monthlyFeeCents: number;
  perUserCents: number;
  trialDays: number;
  graceDays: number;
}

export interface EmpresaCobrada {
  tenantId: string;
  name: string | null;
  status: "trialing" | "active" | "past_due" | "paused" | "exempt" | string;
  trialEndsAt: string | null;
  anchorAt: string | null;
  hasCard: boolean;
  override: { setupFeeCents: number | null; monthlyFeeCents: number | null; perUserCents: number | null } | null;
  outstandingCents: number;
}

export interface CobroAEmpresas {
  catalog: PasarelaDelCatalogo[];
  gateway: PasarelaConectada | null;
  pricing: PreciosAEmpresas | null;
  minimums: { currency: string; perUserCents: number; monthlyFeeCents: number };
  collectedLast30Cents: number;
  outstandingCents: number;
  companies: EmpresaCobrada[];
}

export const cobroAEmpresasService = {
  leer: () => get<CobroAEmpresas>("/reseller/company-billing"),
  /** Las credenciales van una vez y no vuelven: el servidor nunca las devuelve. */
  conectar: (provider: string, credentials: Record<string, string>) =>
    put<PasarelaConectada>("/reseller/company-billing/gateway", { provider, credentials }),
  desconectar: () => del<{ removed: boolean }>("/reseller/company-billing/gateway"),
  guardarPrecios: (precios: PreciosAEmpresas) =>
    put<PreciosAEmpresas>("/reseller/company-billing/pricing", precios),
  ajustarEmpresa: (tenantId: string, datos: Partial<{
    setupFeeCents: number | null; monthlyFeeCents: number | null; perUserCents: number | null; exempt: boolean;
  }>) => patch<unknown>(`/reseller/company-billing/companies/${tenantId}`, datos),
};
