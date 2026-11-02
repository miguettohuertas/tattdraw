/**
 * Matemática do pincel.
 *
 * O tamanho do pincel é definido em unidades do mundo 3D (no TattDraw, metros de pele), não em
 * pixels da textura. Motivo: o mapa UV estica a textura de forma diferente em cada parte do corpo.
 * Um círculo de 20 px na textura pode virar uma elipse na pele. Para o traço ter a mesma largura
 * em qualquer lugar, calculamos quantos pixels da textura cabem em 1 metro de pele, naquele
 * triângulo, em cada direção.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Raio do pincel conforme a pressão da caneta.
 * Com pressão 0 o raio é `minScale` × `baseRadius`; com pressão 1, é o `baseRadius` inteiro.
 */
export function brushRadius(baseRadius: number, pressure: number, minScale = 0.3): number {
  const p = Math.min(1, Math.max(0, pressure));
  return baseRadius * (minScale + (1 - minScale) * p);
}

/**
 * Quanto do mundo 3D corresponde a uma unidade inteira de UV, num triângulo.
 *
 * Devolve `{ u, v }`: comprimento (em unidades do mundo) que se percorre na superfície ao andar
 * de 0 a 1 em u, e de 0 a 1 em v. Para converter um raio `r` do mundo em pixels de uma textura
 * de largura W e altura H: `rx = r / u * W` e `ry = r / v * H`.
 *
 * Como funciona: num triângulo, a posição varia linearmente com o UV. Resolvemos o sistema
 * 2 × 2 que leva as diferenças de UV das arestas às diferenças de posição, obtendo as derivadas
 * dP/du e dP/dv. O tamanho de cada derivada é o que queremos.
 *
 * Aproximação: ignoramos a rotação do UV dentro do triângulo, então o pincel vira uma elipse
 * alinhada aos eixos da textura. Para mapas UV razoáveis isso é suficiente.
 *
 * Devolve `null` se o triângulo não tiver área em UV (UV degenerado), caso em que não dá para pintar.
 */
export function uvScaleFromTriangle(
  p0: Vec3,
  p1: Vec3,
  p2: Vec3,
  uv0: Vec2,
  uv1: Vec2,
  uv2: Vec2,
): { u: number; v: number } | null {
  const e1 = sub(p1, p0);
  const e2 = sub(p2, p0);
  const du1 = uv1.x - uv0.x;
  const dv1 = uv1.y - uv0.y;
  const du2 = uv2.x - uv0.x;
  const dv2 = uv2.y - uv0.y;

  const det = du1 * dv2 - du2 * dv1;
  if (Math.abs(det) < 1e-12) return null;

  const dPdu = scale(sub(scale(e1, dv2), scale(e2, dv1)), 1 / det);
  const dPdv = scale(sub(scale(e2, du1), scale(e1, du2)), 1 / det);

  return { u: length(dPdu), v: length(dPdv) };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}
