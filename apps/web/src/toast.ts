import { getElement } from './dom';

const VISIBLE_MS = 2500;
let timer: number | undefined;

/** Mostra um aviso curto na parte de baixo da tela, que some sozinho. */
export function showToast(message: string): void {
  const toast = getElement<HTMLElement>('#toast');
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    toast.hidden = true;
  }, VISIBLE_MS);
}
