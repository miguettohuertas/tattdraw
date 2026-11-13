import { createViewer } from '@tattdraw/viewer';
import { setupBrushControls } from './brush-controls';
import { getElement } from './dom';
import { startFpsMeter } from './fps';
import './style.css';

const canvas = getElement<HTMLCanvasElement>('#viewport');
const undoButton = getElement<HTMLButtonElement>('#undo');
const redoButton = getElement<HTMLButtonElement>('#redo');
const clearButton = getElement<HTMLButtonElement>('#clear');
const hud = getElement<HTMLElement>('#hud');

// Para testar desempenho: abra com ?tex=4096 para usar uma textura de 4096 × 4096 px.
const params = new URLSearchParams(location.search);
const textureSize = Number(params.get('tex')) || 2048;

const viewer = createViewer(canvas, {
  textureSize,
  // Os botões só ficam ativos quando há o que desfazer ou refazer.
  onHistoryChange: ({ canUndo, canRedo }) => {
    undoButton.disabled = !canUndo;
    redoButton.disabled = !canRedo;
  },
});

const detachBrushControls = setupBrushControls(viewer);

undoButton.addEventListener('click', () => viewer.undo());
redoButton.addEventListener('click', () => viewer.redo());
clearButton.addEventListener('click', () => viewer.clearPaint());

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
  stopFps();
  viewer.dispose();
});
