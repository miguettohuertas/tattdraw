/**
 * Conversão entre coordenadas UV (onde o raio atinge o modelo 3D) e pixels da textura.
 *
 * - UV vai de 0 a 1 nos dois eixos. No three.js (e no glTF), v = 0 fica EMBAIXO da imagem.
 * - Num canvas 2D, y = 0 fica EM CIMA.
 * Por isso o eixo vertical precisa ser invertido: y = (1 - v) * altura.
 */

export interface UV {
  u: number;
  v: number;
}

export interface Pixel {
  x: number;
  y: number;
}

/** Converte uma coordenada UV num pixel da textura de tamanho `width` × `height`. */
export function uvToPixel(uv: UV, width: number, height: number): Pixel {
  if (width <= 0 || height <= 0) {
    throw new RangeError('width e height precisam ser maiores que zero');
  }
  return {
    x: clamp(uv.u, 0, 1) * width,
    y: (1 - clamp(uv.v, 0, 1)) * height,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
