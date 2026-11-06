// Documents lightbox: a native <dialog> opened with showModal(). Modal = the page behind is inert; Escape closes
// (native cancel); Tab is trapped explicitly (Chrome would otherwise leave for the browser UI); focus returns to the
// opener. data-lenis-prevent is on the dialog and its scroller, and Lenis is stopped while it is open.
import type { Env } from '../env';

interface LenisLike {
  stop: () => void;
  start: () => void;
}

export function init(_env: Env): void {
  const dlg = document.querySelector<HTMLDialogElement>('dialog[data-lightbox]');
  if (!dlg || typeof dlg.showModal !== 'function') return; // no <dialog>: the PDF links still work
  const img = dlg.querySelector<HTMLImageElement>('[data-lb-img]');
  const title = dlg.querySelector<HTMLElement>('[data-lb-title]');
  const meta = dlg.querySelector<HTMLElement>('[data-lb-meta]');
  const pdf = dlg.querySelector<HTMLAnchorElement>('[data-lb-pdf]');
  const closeBtn = dlg.querySelector<HTMLButtonElement>('[data-lightbox-close]');
  const stage = dlg.querySelector<HTMLElement>('[data-lb-stage]');
  if (!img || !title || !meta || !pdf || !closeBtn) return;

  let opener: HTMLElement | null = null;
  const lenis = (): LenisLike | undefined => (window as unknown as { __lenis?: LenisLike }).__lenis;

  const open = (btn: HTMLAnchorElement): void => {
    opener = btn;
    title.textContent = btn.dataset.title ?? '';
    meta.textContent = btn.dataset.meta ?? '';
    // both URLs come from real href attributes, which is what the file:// build rewrites
    const cardPdf = btn.closest('li')?.querySelector<HTMLAnchorElement>('a[data-doc-pdf]');
    pdf.href = cardPdf ? cardPdf.href : '#';
    img.removeAttribute('src'); // never show the previous scan while the next one loads
    img.alt = btn.dataset.title ?? '';
    img.src = btn.href;
    if (stage) stage.scrollTop = 0;
    lenis()?.stop();
    dlg.showModal();
    closeBtn.focus();
  };

  document.querySelectorAll<HTMLAnchorElement>('a[data-doc-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      open(btn);
    });
  });

  closeBtn.addEventListener('click', () => dlg.close());

  // click on the backdrop (the dialog element itself, outside the plate) closes
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  dlg.addEventListener('close', () => {
    lenis()?.start();
    img.removeAttribute('src');
    const back = opener;
    opener = null;
    if (back && document.contains(back)) back.focus();
  });

  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = Array.from(dlg.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const act = document.activeElement;
    if (e.shiftKey && (act === first || !dlg.contains(act))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (act === last || !dlg.contains(act))) {
      e.preventDefault();
      first.focus();
    }
  });
}
