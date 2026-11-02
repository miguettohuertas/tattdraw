import { createViewer } from '@tattdraw/viewer';
import { startFpsMeter } from './fps';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#viewport');
const clearButton = document.querySelector<HTMLButtonElement>('#clear');
const hud = document.querySelector<HTMLElement>('#hud');
if (!canvas || !clearButton || !hud) {
  throw new Error('Elementos #viewport, #clear ou #hud não encontrados no index.html');
}

// Para testar desempenho: abra com ?tex=4096 para usar uma textura de 4096 × 4096 px.
const params = new URLSearchParams(location.search);
const textureSize = Number(params.get('tex')) || 2048;

const viewer = createViewer(canvas, { textureSize });
clearButton.addEventListener('click', () => viewer.clearPaint());
const stopFps = startFpsMeter((fps) => {
  hud.textContent = `${textureSize} px · ${fps} fps`;
});

// Durante o desenvolvimento, o Vite recarrega este módulo; liberamos a cena antiga antes.
import.meta.hot?.dispose(() => {
  stopFps();
  viewer.dispose();
});
