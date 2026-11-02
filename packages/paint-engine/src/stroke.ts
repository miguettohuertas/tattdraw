/**
 * Interpolação de traços.
 *
 * A caneta manda eventos com intervalos irregulares: se você desenhar rápido, dois eventos
 * seguidos podem ficar a 40 px de distância. Se o pincel só "carimbasse" nesses pontos, o
 * traço viraria uma fila de bolinhas. Por isso preenchemos o caminho entre dois pontos com
 * carimbos a cada `spacing` pixels, interpolando também a pressão.
 */

export interface StrokePoint {
  x: number;
  y: number;
  /** Pressão normalizada da caneta, de 0 a 1 (dedo ou mouse costumam mandar 0,5). */
  pressure: number;
}

/**
 * Devolve os pontos de carimbo entre `from` (exclusivo) e `to` (inclusivo).
 * O primeiro ponto do traço deve ser carimbado à parte, quando a caneta encosta.
 */
export function interpolateStroke(
  from: StrokePoint,
  to: StrokePoint,
  spacing: number,
): StrokePoint[] {
  if (spacing <= 0) {
    throw new RangeError('spacing precisa ser maior que zero');
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / spacing));

  const points: StrokePoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: from.x + dx * t,
      y: from.y + dy * t,
      pressure: from.pressure + (to.pressure - from.pressure) * t,
    });
  }
  return points;
}
