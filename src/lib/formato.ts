/**
 * Format checks the forms run before a round trip, so the partner sees the
 * problem next to the field instead of a server message after pressing Send.
 * Deliberately loose: the server keeps the final word.
 */

/** Something@something.tld, no spaces. */
export function correoValido(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** An absolute http(s) address with a dotted host. */
export function webValida(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}
