import { get, post } from "@/services/api";

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
