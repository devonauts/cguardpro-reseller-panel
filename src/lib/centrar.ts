/**
 * Bring an element to the middle of the screen, scrolling whichever container
 * actually scrolls (the page or a panel with its own overflow).
 */
export function centrarEnPantalla(el: HTMLElement | null | undefined): void {
  if (!el) return;
  let p: HTMLElement | null = el.parentElement;
  while (p && !(/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)) {
    p = p.parentElement;
  }
  const pagina = (document.scrollingElement as HTMLElement) || document.documentElement;
  const caja = p ?? pagina;
  const arriba = caja === pagina ? 0 : caja.getBoundingClientRect().top;
  const r = el.getBoundingClientRect();
  const alto = caja === pagina ? window.innerHeight : caja.clientHeight;
  caja.scrollTo({ top: caja.scrollTop + r.top - arriba - alto / 2 + r.height / 2, behavior: "smooth" });
}
