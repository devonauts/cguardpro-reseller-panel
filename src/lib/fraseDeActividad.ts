/**
 * ════════════════════════════════════════════════════════════════════════════
 * LA ACTIVIDAD, CONTADA COMO LO CONTARÍA UNA PERSONA
 *
 * La pantalla de Actividad enseñaba el identificador de la acción, el tipo de
 * objeto en código (`reseller`, `resellerDomain`) y una lista de «Campos:
 * brandHue» o «Ranura: logoDark». Un distribuidor no sabe —ni tiene por qué—
 * qué es nada de eso. Aquí cada línea se convierte en UNA frase:
 *
 *   «Se añadió el dominio admin.miempresa.com»
 *   «CGuard Pro suspendió tu cuenta» + el motivo, si lo hay
 *
 * y en QUIÉN lo hizo: tu equipo (con su correo), CGuard Pro o el sistema.
 *
 * Reglas:
 *   · Nunca se pinta un identificador. Una acción que no esté en el mapa cae
 *     a una frase de su FAMILIA («Cambio en la marca», «Movimiento de
 *     facturación»…) y, si ni eso, a «Acción en tu cuenta».
 *   · Los datos que se nombran son los que una persona reconoce: el nombre de
 *     la empresa, el dominio, el correo invitado, un importe, el motivo.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { t, type Clave } from "@/i18n/idioma";
import { dinero } from "@/lib/dinero";
import { nombreDeRol } from "@/lib/rolDeSocio";
import type { LineaDeActividad } from "@/services/resellerService";

type Datos = Record<string, unknown>;
type Constructor = (d: Datos) => Record<string, string | number>;

const texto = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** «logoDark» → «el logo para fondo oscuro». Una ranura desconocida es «una imagen». */
function imagen(d: Datos): string {
  const ranura = texto(d.slot);
  const CLAVES: Record<string, Clave> = {
    logo: "frase.img.logo",
    logoDark: "frase.img.logoDark",
    favicon: "frase.img.favicon",
    emailLogo: "frase.img.emailLogo",
    appIcon: "frase.img.appIcon",
  };
  return t(CLAVES[ranura] ?? "frase.img.otra");
}

/** Rol de una persona dentro de una EMPRESA del socio (no del equipo del socio). */
function rolDeEmpresa(v: unknown): string {
  const r = texto(v).toLowerCase();
  const CLAVES: Record<string, Clave> = {
    admin: "frase.rolEmpresa.admin",
    dispatcher: "frase.rolEmpresa.dispatcher",
    operationsmanager: "frase.rolEmpresa.operaciones",
    securitysupervisor: "frase.rolEmpresa.supervisor",
    securityguard: "frase.rolEmpresa.vigilante",
    customer: "frase.rolEmpresa.cliente",
    hrmanager: "frase.rolEmpresa.rrhh",
  };
  return t(CLAVES[r] ?? "frase.rolEmpresa.otro");
}

const empresa: Constructor = (d) => ({ empresa: texto(d.name ?? d.tenantName) });
const dominio: Constructor = (d) => ({ dominio: texto(d.hostname) });
const monto: Constructor = (d) => ({
  monto: typeof d.amountCents === "number" ? dinero(d.amountCents) : "",
});

/**
 * Acción → [clave de la frase, datos que la frase nombra].
 * Una clave que termina en «Nombre» se usa sólo si el dato existe; si no,
 * se usa la misma clave sin «Nombre» (la frase que no lo menciona).
 */
export const FRASES: Record<string, [Clave, Constructor?]> = {
  // Marca
  "branding.draft.update": ["frase.brandingDraft"],
  "reseller.branding.draft": ["frase.brandingDraft"],
  "branding.asset.upload": ["frase.brandingUpload", (d) => ({ imagen: imagen(d) })],
  "reseller.branding.asset.upload": ["frase.brandingUpload", (d) => ({ imagen: imagen(d) })],
  "branding.asset.remove": ["frase.brandingRemove", (d) => ({ imagen: imagen(d) })],
  "reseller.branding.asset.remove": ["frase.brandingRemove", (d) => ({ imagen: imagen(d) })],
  "branding.publish": ["frase.brandingPublish"],
  "reseller.branding.publish": ["frase.brandingPublish"],

  // Empresas
  "reseller.company.create": ["frase.companyCreateNombre", empresa],
  "reseller.company.create_on_behalf": ["frase.companyCreateOnBehalfNombre", empresa],
  "reseller.company.self_signup": ["frase.companySelfSignupNombre", empresa],
  "reseller.company.update": ["frase.companyUpdate"],
  "reseller.company.support_access": ["frase.companySupportAccess"],
  "reseller.company.addon.activate": ["frase.companyAddon"],
  "reseller.company.users.invite": ["frase.companyUserInviteNombre", (d) => ({ email: texto(d.email), rol: rolDeEmpresa(d.rol) })],
  "reseller.company.users.revoke": ["frase.companyUserRevoke"],
  "reseller.company.users.restore": ["frase.companyUserRestore"],
  "reseller.company.users.role": ["frase.companyUserRole", (d) => ({ rol: rolDeEmpresa(d.rol ?? d.role) })],

  // Estado de la cuenta (lo decide CGuard Pro)
  "reseller.status.begin_onboarding": ["frase.statusBeginOnboarding"],
  "reseller.status.activate": ["frase.statusActivate"],
  "reseller.status.mark_past_due": ["frase.statusPastDue"],
  "reseller.status.restrict": ["frase.statusRestrict"],
  "reseller.status.restore": ["frase.statusRestore"],
  "reseller.status.suspend": ["frase.statusSuspend"],
  "reseller.status.reinstate": ["frase.statusReinstate"],
  "reseller.status.terminate_open": ["frase.statusTerminateOpen"],
  "reseller.status.terminate_finalize": ["frase.statusTerminate"],
  // Es una EMPRESA del socio la que queda suspendida (su cobro), no la cuenta.
  "reseller.disposition.suspend_executed": ["frase.companySuspended"],
  "reseller.create": ["frase.resellerCreate"],
  "reseller.update": ["frase.resellerUpdate"],
  "reseller.owner.resend_invitation": ["frase.ownerResend"],

  // Equipo
  "team.invite": ["frase.teamInvite", (d) => ({ rol: nombreDeRol(texto(d.role)) })],
  "team.role_change": ["frase.teamRoleChange", (d) => ({ rol: nombreDeRol(texto(d.role)) })],
  "team.deactivate": ["frase.teamDeactivate"],
  "team.reinvite": ["frase.teamReinvite"],

  // Dominios
  "custom_domain.created": ["frase.domainCreatedNombre", dominio],
  "custom_domain.verification_requested": ["frase.domainVerifyRequestedNombre", dominio],
  "custom_domain.verified": ["frase.domainVerifiedNombre", dominio],
  "custom_domain.removed": ["frase.domainRemovedNombre", dominio],
  "custom_domain.deactivated": ["frase.domainDeactivatedNombre", dominio],
  "custom_domain.primary_changed": ["frase.domainPrimaryNombre", dominio],
  "reseller.domain.activate": ["frase.domainVerifiedNombre", dominio],
  "reseller.domain.deactivate": ["frase.domainDeactivatedNombre", dominio],

  // Asistente de alta y contrato
  "onboarding.advance": ["frase.onboardingAdvance"],
  "onboarding.back": ["frase.onboardingBack"],
  "onboarding.complete": ["frase.onboardingComplete"],
  "agreement.initial": ["frase.agreementInitial"],
  "agreement.sign": ["frase.agreementSigned"],
  "agreement.signed": ["frase.agreementSigned"],
  "reseller.contract.version": ["frase.contractVersion"],
  "reseller.application.import": ["frase.applicationImport"],

  // Facturación del socio
  "billing.activation.pay": ["frase.activationPayNombre", monto],
  "billing.activation.pay_confirm": ["frase.activationPaidNombre", monto],
  "billing.invoice.pay": ["frase.invoicePay"],
  "billing.invoice.pay_confirm": ["frase.invoicePaid"],
  "billing.invoice.refund": ["frase.invoiceRefund"],
  "billing.payment_method.setup_intent": ["frase.cardStart"],
  "billing.payment_method.confirm": ["frase.cardSaved"],
  "billing.payment_method.remove": ["frase.cardRemoved"],
  "billing.subscription.cancel": ["frase.subscriptionCancel"],
  "reseller.invoice.build": ["frase.invoiceIssued"],
  "reseller.invoice.finalize": ["frase.invoiceIssued"],
  "reseller.invoice.emailed": ["frase.invoiceEmailed"],
  "reseller.invoice.resend": ["frase.invoiceEmailed"],
  "reseller.invoice.email_failed": ["frase.invoiceEmailFailed"],
  "reseller.invoice.void": ["frase.invoiceVoid"],
  "reseller.invoice.mark_paid": ["frase.invoicePaid"],
  "reseller.invoice.adjust": ["frase.invoiceAdjust"],

  // Cobro a las empresas
  "company_billing.pricing": ["frase.companyBillingPricing"],
  "company_billing.company": ["frase.companyBillingCompany"],
  "company_billing.gateway.connect": ["frase.gatewayConnect"],
  "company_billing.gateway.disconnect": ["frase.gatewayDisconnect"],
  "company_billing.notice.trial_ending": ["frase.noticeTrialEnding"],
  "company_billing.notice.charge_failed": ["frase.noticeChargeFailed"],
  "company_billing.notice.paused": ["frase.noticePaused"],

  "analytics.update": ["frase.analyticsUpdate"],
};

/** Si una acción no está en el mapa, su familia dice al menos de qué va. */
const FAMILIAS: Array<[string, Clave]> = [
  ["branding.", "frase.familia.marca"],
  ["reseller.branding.", "frase.familia.marca"],
  ["reseller.company.", "frase.familia.empresas"],
  ["reseller.status.", "frase.familia.estado"],
  ["team.", "frase.familia.equipo"],
  ["custom_domain.", "frase.familia.dominios"],
  ["reseller.domain.", "frase.familia.dominios"],
  ["onboarding.", "frase.familia.alta"],
  ["agreement.", "frase.familia.contrato"],
  ["reseller.contract.", "frase.familia.contrato"],
  ["billing.", "frase.familia.facturacion"],
  ["reseller.invoice.", "frase.familia.facturacion"],
  ["company_billing.", "frase.familia.cobroEmpresas"],
];

/** La frase de una línea, en el idioma del panel. Nunca un identificador. */
export function fraseDeActividad(fila: Pick<LineaDeActividad, "action" | "details">): string {
  const d: Datos = fila.details ?? {};
  const entrada = FRASES[fila.action];
  if (entrada) {
    const [clave, datos] = entrada;
    const valores = datos ? datos(d) : {};
    // «…Nombre» sólo si trae el dato que nombra; si no, la frase sin él.
    if (clave.endsWith("Nombre")) {
      const lleno = Object.values(valores).some((v) => String(v).trim() !== "");
      if (!lleno) return t(clave.replace(/Nombre$/, "") as Clave, valores);
    }
    return t(clave, valores);
  }
  const familia = FAMILIAS.find(([prefijo]) => fila.action.startsWith(prefijo));
  return t(familia ? familia[1] : "frase.familia.otra");
}

/** El motivo, si la decisión lo trae (suspensiones, restablecimientos…). */
export function motivoDeActividad(fila: Pick<LineaDeActividad, "details">): string | null {
  const m = fila.details?.reason;
  return typeof m === "string" && m.trim() ? m.trim() : null;
}

/** Decisiones que sólo toma la plataforma: su autor es «CGuard Pro», no un correo. */
const DE_LA_PLATAFORMA = [
  "reseller.status.", "reseller.invoice.", "reseller.contract.",
  "reseller.create", "reseller.update", "reseller.owner.resend_invitation",
  "reseller.application.import", "reseller.company.create_on_behalf", "reseller.company.support_access",
];

/**
 * Quién lo hizo. Una decisión de la plataforma es «CGuard Pro» —el correo
 * interno de su personal no es del socio—; lo demás, el correo de quien lo
 * hizo (tu equipo); sin nadie detrás, el sistema.
 *
 * No se decide por `actorRole`: el dueño del socio también llega sin rol al
 * dar de alta una empresa o firmar el contrato.
 */
export function quienDeActividad(fila: Pick<LineaDeActividad, "action" | "actorEmail">): string {
  if (DE_LA_PLATAFORMA.some((p) => fila.action.startsWith(p))) return t("frase.quien.plataforma");
  if (fila.actorEmail) return fila.actorEmail;
  return t("frase.quien.sistema");
}
