/**
 * What goes in the "Host" field at the partner's DNS provider.
 *
 * Namecheap, GoDaddy, Hostinger, Cloudflare… all append the domain to what is
 * typed there. Showing the full name (`admin.example.com`) made partners paste
 * it whole, and the record ended up at `admin.example.com.example.com`, where
 * nobody looks. So we show the part BEFORE the registered domain.
 */

/* Second-level suffixes where the registered domain has three labels. Not the
   full public-suffix list: the ones our partners' countries actually use. */
const SUFIJOS_DOBLES = new Set([
  "com.mx", "org.mx", "net.mx", "gob.mx", "edu.mx",
  "com.ec", "org.ec", "net.ec", "gob.ec", "edu.ec", "fin.ec",
  "com.co", "org.co", "net.co", "gov.co", "edu.co",
  "com.pe", "org.pe", "net.pe", "gob.pe", "edu.pe",
  "com.ar", "org.ar", "net.ar", "gob.ar",
  "com.br", "net.br", "org.br", "gov.br",
  "com.ve", "co.ve", "com.bo", "com.py", "com.uy", "com.gt", "com.hn",
  "com.sv", "com.ni", "co.cr", "com.pa", "com.do", "com.pr", "cl.cl",
  "co.uk", "org.uk", "com.au", "net.au", "org.au", "co.nz", "co.za",
  "com.es", "org.es",
]);

/** `admin.vanderbluedesign.com` → `vanderbluedesign.com`. */
export function dominioRegistrado(hostname: string): string {
  const partes = String(hostname || "").trim().replace(/\.$/, "").toLowerCase().split(".").filter(Boolean);
  if (partes.length <= 2) return partes.join(".");
  const dos = partes.slice(-2).join(".");
  return SUFIJOS_DOBLES.has(dos) ? partes.slice(-3).join(".") : dos;
}

/**
 * `_acme-challenge.admin.example.com` with domain `admin.example.com` →
 * `_acme-challenge.admin`; the apex itself → `@`.
 */
export function hostRelativo(nombre: string, hostname: string): string {
  const n = String(nombre || "").trim().replace(/\.$/, "");
  const base = dominioRegistrado(hostname || n);
  if (!base) return n;
  if (n.toLowerCase() === base) return "@";
  const sufijo = `.${base}`;
  return n.toLowerCase().endsWith(sufijo) ? n.slice(0, -sufijo.length) : n;
}
