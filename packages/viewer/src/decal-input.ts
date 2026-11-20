import type { DecalTool } from './decal-tool';
import { capturePointer } from './pointer-capture';

/** Um toque conta como "tocar" (e não arrastar) se andar menos que isso, em pixels de tela. */
const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_MS = 400;

/**
 * Liga a caneta, o mouse e o dedo ao posicionamento do carimbo.
 *
 * - Caneta ou botão esquerdo do mouse sobre o modelo: arrastar move a imagem.
 * - Dedo: arrastar continua girando a câmera (para ver o braço de outro ângulo), e um toque
 *   rápido no modelo leva a imagem até aquele ponto. Assim dá para posicionar sem caneta.
 *
 * Como a pintura, precisa ser registrada ANTES do OrbitControls, para poder impedir que a câmera
 * gire quando a caneta está arrastando a imagem.
 */
export function attachDecalInput(canvas: HTMLCanvasElement, decal: DecalTool): () => void {
  let dragging: number | null = null;
  let tap: { id: number; x: number; y: number; time: number } | null = null;

  const toNdc = (e: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    ];
  };

  const moveTo = (e: PointerEvent): boolean => {
    const hit = decal.hitAtNdc(...toNdc(e));
    if (hit) decal.placeAt(hit);
    return hit !== undefined;
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (!decal.active) return;

    if (e.pointerType === 'touch') {
      // Não paramos o evento: o dedo ainda gira a câmera. Só anotamos para ver se foi um toque.
      tap = e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp } : null;
      return;
    }
    if (dragging !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!moveTo(e)) return; // fora do modelo: deixa a câmera girar

    e.stopImmediatePropagation();
    e.preventDefault();
    capturePointer(canvas, e.pointerId);
    dragging = e.pointerId;
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId === dragging) moveTo(e);
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === dragging) {
      dragging = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      return;
    }
    if (tap && e.pointerId === tap.id && decal.active) {
      const moved = Math.hypot(e.clientX - tap.x, e.clientY - tap.y);
      if (moved <= TAP_MAX_MOVE_PX && e.timeStamp - tap.time <= TAP_MAX_MS) moveTo(e);
    }
    tap = null;
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId === dragging) dragging = null;
    tap = null;
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
  };
}
