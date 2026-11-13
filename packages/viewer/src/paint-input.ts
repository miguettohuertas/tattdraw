import { Raycaster, Vector2 } from 'three';
import type { Camera, Intersection, Mesh } from 'three';
import { brushRadius, interpolateStroke } from '@tattdraw/paint-engine';
import type { StrokePoint } from '@tattdraw/paint-engine';
import type { BrushTool, PaintSurface } from './paint-surface';

export interface Brush {
  /** Pincel pinta com `color`; borracha deixa a camada transparente por onde passa. */
  tool: BrushTool;
  /** Raio com pressão máxima, em metros de pele (0.0025 = 2,5 mm). */
  radius: number;
  color: string;
}

export interface PaintInputOptions {
  canvas: HTMLCanvasElement;
  camera: Camera;
  target: Mesh;
  surface: PaintSurface;
  /**
   * O pincel atual. É lido a cada carimbo, então quem chamou pode alterar o objeto a qualquer
   * momento (trocar cor, tamanho ou ferramenta) e o próximo carimbo já usa o valor novo.
   */
  brush: Brush;
}

/**
 * Distância, em pixels de tela, entre dois pontos testados ao longo do traço.
 * Interpolamos na tela (e não na textura) e lançamos um raio em cada ponto: assim o traço segue a
 * curvatura do corpo e atravessa costuras do UV sem riscos retos atravessando a textura.
 */
const SCREEN_SPACING_PX = 1;

/**
 * Liga a caneta (e o mouse) à pintura.
 *
 * Regras de quem faz o quê:
 * - Caneta ou botão esquerdo do mouse começando **sobre o modelo** → pinta.
 * - Começando fora do modelo, com o dedo, ou com outro botão do mouse → gira/aproxima a câmera.
 *   Assim o dedo (ou a palma apoiada na tela) nunca risca o desenho por acidente.
 *
 * IMPORTANTE: precisa ser chamada ANTES de criar o OrbitControls. Os dois escutam o mesmo
 * `pointerdown` no canvas; quando o traço começa no modelo, este listener roda primeiro e para o
 * evento (`stopImmediatePropagation`), então a câmera não se mexe.
 *
 * Devolve uma função que desliga tudo.
 */
export function attachPaintInput(options: PaintInputOptions): () => void {
  const { canvas, camera, target, surface, brush } = options;
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  let activePointer: number | null = null;
  let last: StrokePoint | null = null;

  const hitAt = (clientX: number, clientY: number): Intersection | undefined => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(target, false)[0];
  };

  const toPoint = (e: PointerEvent): StrokePoint => ({
    x: e.clientX,
    y: e.clientY,
    // Mouse com botão apertado manda 0,5; a caneta manda a pressão real (0 a 1).
    pressure: e.pressure,
  });

  const stampAt = (point: StrokePoint, hit: Intersection): void => {
    surface.stamp(hit, brushRadius(brush.radius, point.pressure), brush.tool, brush.color);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (activePointer !== null) return;
    if (e.pointerType === 'touch') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const hit = hitAt(e.clientX, e.clientY);
    if (!hit) return; // fora do modelo: deixa a câmera girar

    e.stopImmediatePropagation();
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    activePointer = e.pointerId;
    last = toPoint(e);
    // Tudo que for pintado até a caneta levantar conta como UMA ação para o desfazer.
    surface.beginStroke();
    stampAt(last, hit);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer || !last) return;

    // A caneta pode gerar mais de 200 pontos por segundo, mas o navegador entrega um evento por
    // quadro. getCoalescedEvents devolve os pontos intermediários, para o traço não ficar facetado.
    const coalesced = e.getCoalescedEvents?.() ?? [];
    const events = coalesced.length > 0 ? coalesced : [e];

    for (const ev of events) {
      const next = toPoint(ev);
      for (const point of interpolateStroke(last, next, SCREEN_SPACING_PX)) {
        const hit = hitAt(point.x, point.y);
        if (hit) stampAt(point, hit);
      }
      last = next;
    }
  };

  const onPointerEnd = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    last = null;
    surface.endStroke();
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);

  return () => {
    surface.endStroke();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerEnd);
    canvas.removeEventListener('pointercancel', onPointerEnd);
  };
}
