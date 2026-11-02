import { createViewer } from '@tattdraw/viewer';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#viewport');
if (!canvas) {
  throw new Error('Elemento #viewport não encontrado no index.html');
}

const viewer = createViewer(canvas);

// Durante o desenvolvimento, o Vite recarrega este módulo; liberamos a cena antiga antes.
import.meta.hot?.dispose(() => viewer.dispose());
