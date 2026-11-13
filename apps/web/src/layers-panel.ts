import type { LayerInfo, LayersState } from '@tattdraw/viewer';
import { getElement } from './dom';
import { createIcon } from './icons';

/** O que o painel pede ao app. O painel não conhece o viewer: só chama estas funções. */
export interface LayerActions {
  add(): void;
  remove(id: string): void;
  select(id: string): void;
  setVisible(id: string, visible: boolean): void;
  /** Opacidade de 0 a 1. */
  setOpacity(id: string, opacity: number): void;
  /** +1 sobe a camada na pilha, -1 desce. */
  move(id: string, delta: number): void;
  /** Apaga tudo da camada ativa. */
  clear(): void;
}

export interface LayersPanel {
  /** Redesenha o painel a partir do estado das camadas. */
  render(state: LayersState): void;
  detach(): void;
}

/**
 * Painel de camadas.
 *
 * Segue o mesmo padrão dos controles do pincel: o painel nunca guarda estado próprio. Um clique
 * chama uma ação; o viewer muda as camadas e avisa; `render` redesenha tudo a partir do estado
 * recebido. Assim o painel sempre mostra o que realmente existe, inclusive depois de desfazer.
 */
export function setupLayersPanel(actions: LayerActions): LayersPanel {
  const toggle = getElement<HTMLButtonElement>('#layers-toggle');
  const panel = getElement<HTMLElement>('#layers-panel');
  const list = getElement<HTMLUListElement>('#layer-list');
  const opacityInput = getElement<HTMLInputElement>('#layer-opacity');
  const opacityLabel = getElement<HTMLElement>('#opacity-label');
  const addButton = getElement<HTMLButtonElement>('#layer-add');
  const upButton = getElement<HTMLButtonElement>('#layer-up');
  const downButton = getElement<HTMLButtonElement>('#layer-down');
  const clearButton = getElement<HTMLButtonElement>('#clear');
  const removeButton = getElement<HTMLButtonElement>('#layer-remove');

  /** Camada ativa no último `render`; os botões do rodapé agem sobre ela. */
  let activeId = '';

  const setOpen = (open: boolean): void => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-pressed', String(open));
  };

  const createRow = (layer: LayerInfo, isActive: boolean): HTMLLIElement => {
    const row = document.createElement('li');
    row.className = 'layer';
    row.dataset.layerId = layer.id;
    row.classList.toggle('is-hidden', !layer.visible);
    if (isActive) row.setAttribute('aria-current', 'true');

    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'icon eye';
    eye.setAttribute('aria-pressed', String(layer.visible));
    eye.setAttribute('aria-label', `${layer.visible ? 'Ocultar' : 'Mostrar'} ${layer.name}`);
    eye.title = layer.visible ? 'Ocultar' : 'Mostrar';
    eye.append(createIcon(layer.visible ? 'eye' : 'eye-off'));
    eye.addEventListener('click', () => actions.setVisible(layer.id, !layer.visible));

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'layer-name';
    name.textContent = layer.name;
    name.addEventListener('click', () => actions.select(layer.id));

    row.append(eye, name);
    return row;
  };

  const render = (state: LayersState): void => {
    activeId = state.activeId;
    const activeIndex = state.layers.findIndex((layer) => layer.id === activeId);
    const active = state.layers[activeIndex];

    // A lista do estado vai de baixo para cima; na tela, a camada de cima aparece primeiro.
    const rows = [...state.layers]
      .reverse()
      .map((layer) => createRow(layer, layer.id === activeId));
    list.replaceChildren(...rows);

    const percent = Math.round((active?.opacity ?? 1) * 100);
    opacityInput.value = String(percent);
    opacityLabel.textContent = `${percent}%`;

    addButton.disabled = !state.canAdd;
    upButton.disabled = activeIndex >= state.layers.length - 1;
    downButton.disabled = activeIndex <= 0;
    removeButton.disabled = state.layers.length <= 1;
  };

  // `hidden` pode ser true, false ou "until-found"; qualquer valor diferente de false é "fechado".
  toggle.addEventListener('click', () => setOpen(panel.hidden !== false));
  addButton.addEventListener('click', () => actions.add());
  upButton.addEventListener('click', () => actions.move(activeId, 1));
  downButton.addEventListener('click', () => actions.move(activeId, -1));
  clearButton.addEventListener('click', () => actions.clear());
  removeButton.addEventListener('click', () => actions.remove(activeId));
  opacityInput.addEventListener('input', () =>
    actions.setOpacity(activeId, Number(opacityInput.value) / 100),
  );

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') setOpen(false);
  };
  window.addEventListener('keydown', onKeyDown);

  return {
    render,
    detach: () => window.removeEventListener('keydown', onKeyDown),
  };
}
