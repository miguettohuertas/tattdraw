/**
 * Carimbo (decal): as contas sem tela.
 *
 * Um carimbo é uma imagem projetada sobre a pele, como um slide projetado de frente sobre o
 * braço. O projetor fica apontado para a pele, ao longo da normal (a direção "para fora" da
 * superfície) no ponto escolhido. Para isso precisamos de três direções perpendiculares entre si:
 * - `normal`: para onde a pele aponta naquele ponto;
 * - `right` e `up`: os eixos da imagem, deitados sobre a pele.
 */
import type { Vec3 } from './brush';

export interface Frame {
  right: Vec3;
  up: Vec3;
  normal: Vec3;
}

/**
 * Monta os eixos da imagem num ponto da pele.
 *
 * `upHint` diz para onde deve apontar o "para cima" da imagem (no TattDraw, o "para cima" da
 * câmera no momento em que a imagem foi importada). Como ele raramente está deitado sobre a pele,
 * tiramos a parte dele que aponta para fora da pele e ficamos com a sombra dele na superfície
 * (processo de Gram-Schmidt). `angle` gira a imagem sobre a pele, em radianos, no sentido
 * anti-horário visto de fora.
 *
 * Se `upHint` for paralelo à normal (olhando a pele exatamente de cima), usamos `fallback`.
 */
export function surfaceFrame(normal: Vec3, upHint: Vec3, angle = 0, fallback: Vec3 = X): Frame {
  const n = normalize(normal);
  let up = rejectFrom(upHint, n);
  if (length(up) < 1e-6) up = rejectFrom(fallback, n);
  if (length(up) < 1e-6) up = rejectFrom(Y, n);
  up = normalize(up);
  let right = cross(up, n);

  if (angle !== 0) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const r = right;
    right = add(scale(r, c), scale(up, s));
    up = add(scale(up, c), scale(r, -s));
  }
  return { right, up, normal: n };
}

/**
 * Converte "fundo branco" em transparente, mantendo a aparência sobre fundo branco.
 *
 * Desenhos de tatuagem costumam vir em preto sobre branco (JPG, foto, escaneado). Para o branco
 * não virar um retângulo na pele, cada pixel vira "tinta" com a transparência que tinha que ter
 * para, pintado sobre branco, dar exatamente a cor original:
 *   alfa = 1 - (canal mais claro) / 255
 *   cor  = (original - (1 - alfa) × 255) / alfa
 * Branco puro some, preto puro continua preto e opaco, cinzas viram preto semitransparente,
 * e cores fortes continuam com a mesma cor. Pixels que já eram transparentes ficam como estão.
 *
 * Altera `data` no lugar (formato RGBA, como `ImageData.data`).
 */
export function whiteToAlpha(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;

    const ink = 1 - Math.min(r, g, b) / 255;
    if (ink <= 0) {
      data[i + 3] = 0;
      continue;
    }
    const keep = 255 * (1 - ink);
    data[i] = (r - keep) / ink;
    data[i + 1] = (g - keep) / ink;
    data[i + 2] = (b - keep) / ink;
    data[i + 3] = a * ink;
  }
}

/** Verdadeiro se algum pixel já tiver transparência (então a imagem não precisa de ajuste). */
export function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 255) < 250) return true;
  }
  return false;
}

/**
 * Tamanho em que a imagem será guardada: o mesmo, ou reduzido para o lado maior caber em
 * `maxSide`. Fotos de celular passam de 4000 px, o que só gastaria memória.
 */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const largest = Math.max(width, height);
  if (largest <= maxSide) return { width, height };
  const factor = maxSide / largest;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

/** Nome da camada criada por um carimbo: o nome do arquivo, sem extensão e sem exageros. */
export function layerNameFromFile(fileName: string, maxLength = 24): string {
  const base = fileName.replace(/\.[^./\\]+$/, '').trim() || 'Imagem';
  return base.length > maxLength ? `${base.slice(0, maxLength - 1)}…` : base;
}

const X: Vec3 = { x: 1, y: 0, z: 0 };
const Y: Vec3 = { x: 0, y: 1, z: 0 };

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l === 0 ? a : scale(a, 1 / l);
}

/** Tira de `v` a parte que aponta na direção de `n` (que precisa ter tamanho 1). */
function rejectFrom(v: Vec3, n: Vec3): Vec3 {
  return add(v, scale(n, -dot(v, n)));
}
