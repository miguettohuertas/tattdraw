/**
 * Região alterada ("dirty rect").
 *
 * Para desfazer um traço, não precisamos guardar a textura inteira (16 MB em 2048 px, 64 MB em
 * 4096 px): basta o retângulo que o traço tocou. Estas funções acompanham esse retângulo
 * enquanto os carimbos são desenhados.
 */

/** Limites em coordenadas contínuas (podem ter casas decimais e sair da textura). */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Retângulo em pixels inteiros, sempre dentro da textura. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Devolve os limites aumentados para incluir uma elipse de centro (cx, cy) e raios rx, ry. */
export function includeEllipse(
  bounds: Bounds | null,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): Bounds {
  const ellipse = { minX: cx - rx, minY: cy - ry, maxX: cx + rx, maxY: cy + ry };
  if (!bounds) return ellipse;
  return {
    minX: Math.min(bounds.minX, ellipse.minX),
    minY: Math.min(bounds.minY, ellipse.minY),
    maxX: Math.max(bounds.maxX, ellipse.maxX),
    maxY: Math.max(bounds.maxY, ellipse.maxY),
  };
}

/**
 * Converte os limites num retângulo de pixels inteiros, preso ao tamanho da textura.
 * `padding` acrescenta uma margem: a borda suavizada (antialiasing) do pincel pode tocar um
 * pixel além do raio exato.
 * Devolve `null` se não sobrar nada dentro da textura.
 */
export function toPixelRect(
  bounds: Bounds,
  width: number,
  height: number,
  padding = 1,
): PixelRect | null {
  const x0 = Math.max(0, Math.floor(bounds.minX) - padding);
  const y0 = Math.max(0, Math.floor(bounds.minY) - padding);
  const x1 = Math.min(width, Math.ceil(bounds.maxX) + padding);
  const y1 = Math.min(height, Math.ceil(bounds.maxY) + padding);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
