/** Busca um elemento do index.html e falha com uma mensagem clara se ele não existir. */
export function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento ${selector} não encontrado no index.html`);
  return element;
}
