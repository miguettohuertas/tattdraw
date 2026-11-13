import { createViewer } from '@tattdraw/viewer';
import { setupBrushControls } from './brush-controls';
import { getElement } from './dom';
import { startFpsMeter } from './fps';
import { decorateIcons } from './icons';
import { setupLayersPanel } from './layers-panel';
import { showToast } from './toast';
import './style.css';

decorateIcons();

const canvas = getElement<HTMLCanvasElement>('#viewport');
const undoButton = getElement<HTMLButtonElement>('#undo');
const redoButton = getElement<HTMLButtonElement>('#redo');
const hud = getElement<HTMLElement>('#hud');

// Para testar desempenho: abra com ?tex=4096 para usar uma textura de 4096 × 4096 px.
const params = new URLSearchParams(location.search);
const textureSize = Number(params.get('tex')) || 2048;

// O painel é criado antes do viewer porque o viewer precisa de `layersPanel.render` ao nascer.
// As ações só são chamadas depois, em cliques, quando `viewer` já existe.
const layersPanel = setupLayersPanel({
  add: () => viewer.addLayer(),
  remove: (id) => viewer.removeLayer(id),
  select: (id) => viewer.selectLayer(id),
  setVisible: (id, visible) => viewer.setLayerVisible(id, visible),
  setOpacity: (id, opacity) => viewer.setLayerOpacity(id, opacity),
  move: (id, delta) => viewer.moveLayer(id, delta),
  clear: () => viewer.clearPaint(),
});

const viewer = createViewer(canvas, {
  textureSize,
  // Os botões só ficam ativos quando há o que desfazer ou refazer.
  onHistoryChange: ({ canUndo, canRedo }) => {
    undoButton.disabled = !canUndo;
    redoButton.disabled = !canRedo;
  },
  onLayersChange: layersPanel.render,
  onPaintBlocked: () => showToast('Esta camada está oculta. Mostre a camada para desenhar nela.'),
});
layersPanel.render(viewer.getLayers());

const detachBrushControls = setupBrushControls(viewer);

undoButton.addEventListener('click', () => viewer.undo());
redoButton.addEventListener('click', () => viewer.redo());

// Atalhos: Ctrl+Z desfaz; Ctrl+Y ou Ctrl+Shift+Z refaz (no Mac, Cmd no lugar de Ctrl).
const onKeyDown = (e: KeyboardEvent): void => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    viewer.undo();
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    e.preventDefault();
    viewer.redo();
  }
};
window.addEventListener('keydown', onKeyDown);

const stopFps = startFpsMeter((fps) => {
  hud.textContent = `${textureSize} px · ${fps} fps`;
});

// Durante o desenvolvimento, o Vite recarrega este módulo; liberamos a cena antiga antes.
import.meta.hot?.dispose(() => {
  window.removeEventListener('keydown', onKeyDown);
  detachBrushControls();
  layersPanel.detach();
  stopFps();
  viewer.dispose();
});
