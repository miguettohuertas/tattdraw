import type { BrushTool, Viewer } from '@tattdraw/viewer';
import { DEFAULT_SETTINGS, formatSize, PALETTE, stepSize, toViewerBrush } from './brush-settings';
import type { BrushSettings } from './brush-settings';
import { getElement } from './dom';

/**
 * Liga os controles do pincel (ferramenta, cor, tamanho) ao viewer.
 *
 * O padrão é sempre o mesmo: o usuário mexe num controle → atualizamos `settings` → `apply()`
 * manda o pincel novo para o viewer e redesenha os controles a partir de `settings`.
 * Como a tela é sempre desenhada a partir de um único lugar, ela nunca fica dessincronizada.
 *
 * Devolve uma função que desliga os atalhos de teclado.
 */
export function setupBrushControls(viewer: Viewer): () => void {
  const settings: BrushSettings = structuredClone(DEFAULT_SETTINGS);

  const toolButtons: Record<BrushTool, HTMLButtonElement> = {
    pen: getElement<HTMLButtonElement>('#tool-pen'),
    eraser: getElement<HTMLButtonElement>('#tool-eraser'),
  };
  const swatches = getElement<HTMLElement>('#swatches');
  const customColor = getElement<HTMLInputElement>('#custom-color');
  const sizeInput = getElement<HTMLInputElement>('#size');
  const sizeLabel = getElement<HTMLElement>('#size-label');

  // Cria um botão redondo para cada cor da paleta.
  const swatchButtons = PALETTE.map(({ name, color }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.setProperty('--swatch', color);
    button.title = name;
    button.setAttribute('aria-label', name);
    button.addEventListener('click', () => chooseColor(color));
    swatches.insertBefore(button, customColor.parentElement);
    return { button, color };
  });

  const apply = (): void => {
    viewer.setBrush(toViewerBrush(settings));

    for (const tool of ['pen', 'eraser'] as const) {
      toolButtons[tool].setAttribute('aria-pressed', String(settings.tool === tool));
    }

    const usingPen = settings.tool === 'pen';
    let matchedPalette = false;
    for (const { button, color } of swatchButtons) {
      const selected = usingPen && color === settings.color;
      matchedPalette ||= color === settings.color;
      button.setAttribute('aria-pressed', String(selected));
    }
    // A cor personalizada só aparece marcada quando não é uma das cores da paleta.
    customColor.parentElement?.classList.toggle('selected', usingPen && !matchedPalette);

    const size = settings.sizeMm[settings.tool];
    sizeInput.value = String(size);
    sizeLabel.textContent = formatSize(size);
  };

  const chooseColor = (color: string): void => {
    settings.color = color;
    settings.tool = 'pen'; // escolher uma cor é um pedido para pintar
    apply();
  };

  const chooseTool = (tool: BrushTool): void => {
    settings.tool = tool;
    apply();
  };

  const setSize = (mm: number): void => {
    settings.sizeMm[settings.tool] = mm;
    apply();
  };

  toolButtons.pen.addEventListener('click', () => chooseTool('pen'));
  toolButtons.eraser.addEventListener('click', () => chooseTool('eraser'));
  customColor.addEventListener('input', () => chooseColor(customColor.value));
  sizeInput.addEventListener('input', () => setSize(Number(sizeInput.value)));

  // Atalhos: B = pincel, E = borracha, [ e ] = diminuir e aumentar o tamanho.
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 'b':
        chooseTool('pen');
        break;
      case 'e':
        chooseTool('eraser');
        break;
      case '[':
        setSize(stepSize(settings.sizeMm[settings.tool], -1));
        break;
      case ']':
        setSize(stepSize(settings.sizeMm[settings.tool], 1));
        break;
    }
  };
  window.addEventListener('keydown', onKeyDown);

  apply();
  return () => window.removeEventListener('keydown', onKeyDown);
}
