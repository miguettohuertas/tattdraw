import { getElement } from './dom';

interface Dropdown {
  toggle: HTMLButtonElement;
  panel: HTMLElement;
}

/** Todos os painéis suspensos da barra de cima. Só um fica aberto por vez. */
const dropdowns: Dropdown[] = [];

function setOpen({ toggle, panel }: Dropdown, open: boolean): void {
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-pressed', String(open));
}

const onKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') for (const dropdown of dropdowns) setOpen(dropdown, false);
};

/**
 * Liga um botão a um painel suspenso: clicar abre ou fecha, abrir fecha os outros painéis, e
 * Esc fecha todos. Devolve uma função que desliga o painel.
 */
export function setupDropdown(toggleSelector: string, panelSelector: string): () => void {
  const dropdown: Dropdown = {
    toggle: getElement<HTMLButtonElement>(toggleSelector),
    panel: getElement<HTMLElement>(panelSelector),
  };

  const onClick = (): void => {
    // `hidden` pode ser true, false ou "until-found"; qualquer valor diferente de false é "fechado".
    const opening = dropdown.panel.hidden !== false;
    for (const other of dropdowns) if (other !== dropdown) setOpen(other, false);
    setOpen(dropdown, opening);
  };

  if (dropdowns.length === 0) window.addEventListener('keydown', onKeyDown);
  dropdowns.push(dropdown);
  dropdown.toggle.addEventListener('click', onClick);

  return () => {
    dropdown.toggle.removeEventListener('click', onClick);
    dropdowns.splice(dropdowns.indexOf(dropdown), 1);
    if (dropdowns.length === 0) window.removeEventListener('keydown', onKeyDown);
  };
}
