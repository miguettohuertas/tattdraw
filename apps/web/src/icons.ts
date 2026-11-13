/**
 * Ícones do app, desenhados aqui mesmo como traços SVG numa grade de 24 × 24.
 * Cada ícone é uma lista de caminhos (o atributo `d` de um <path>).
 *
 * Ficam num arquivo só para que o HTML e o código usem os mesmos desenhos: no HTML, basta
 * escrever <button data-icon="undo"> e `decorateIcons` coloca o SVG dentro.
 */
const ICONS = {
  pen: ['M4 20l1-5L16 4l4 4L9 19z', 'M13 7l4 4'],
  eraser: ['M3.5 14.5 12 6l6 6-6.5 6.5H8z', 'M8.5 9.5l6 6', 'M8 18.5h12'],
  undo: ['M8 5 3 10l5 5', 'M3 10h11a5.5 5.5 0 0 1 0 11h-3'],
  redo: ['M16 5l5 5-5 5', 'M21 10H10a5.5 5.5 0 0 0 0 11h3'],
  layers: ['M12 3 3 8l9 5 9-5z', 'M3 12.5l9 5 9-5', 'M3 17l9 5 9-5'],
  eye: [
    'M2 12c2.7-4.5 6-7 10-7s7.3 2.5 10 7c-2.7 4.5-6 7-10 7s-7.3-2.5-10-7z',
    'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z',
  ],
  'eye-off': [
    'M2 12c2.7-4.5 6-7 10-7s7.3 2.5 10 7c-2.7 4.5-6 7-10 7s-7.3-2.5-10-7z',
    'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z',
    'M4 4l16 16',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  up: ['M12 19V5', 'M6 11l6-6 6 6'],
  down: ['M12 5v14', 'M6 13l6 6 6-6'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6.5 7l1 13h9l1-13'],
} as const;

export type IconName = keyof typeof ICONS;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Cria o elemento <svg> de um ícone. A cor e a espessura do traço vêm do CSS. */
export function createIcon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true'); // o nome acessível fica no botão (aria-label)
  for (const d of ICONS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** Troca o ícone de um elemento. */
export function setIcon(element: Element, name: IconName): void {
  element.replaceChildren(createIcon(name));
}

/** Coloca o ícone em cada elemento marcado com data-icon="nome" no HTML. */
export function decorateIcons(root: ParentNode = document): void {
  for (const element of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    const name = element.dataset.icon;
    if (name && name in ICONS) setIcon(element, name as IconName);
  }
}
