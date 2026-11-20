import type { MeshData } from './mesh-data';

/**
 * Membro (braço, antebraço, perna...) gerado a partir de medidas.
 *
 * Todo membro é tratado como um "tubo" que vai da ponta mais distante do tronco (distal) até a
 * mais próxima (proximal), com três circunferências e um comprimento, tudo em centímetros:
 * - `lengthCm`: comprimento da ponta distal até a proximal;
 * - `distalCm`: circunferência na ponta distal (no antebraço, o punho);
 * - `peakCm`: circunferência na parte mais grossa (no antebraço, a "barriga" do músculo);
 * - `proximalCm`: circunferência na ponta proximal (no antebraço, o cotovelo).
 *
 * O que muda de um membro para outro é a "receita" da forma (`LimbShape`): onde fica a parte
 * mais grossa, se a seção é achatada, onde ficam os músculos e por onde passa a costura.
 */
export interface LimbMeasurements {
  lengthCm: number;
  distalCm: number;
  peakCm: number;
  proximalCm: number;
}

export type MeasurementLimits = Record<keyof LimbMeasurements, { min: number; max: number }>;

/** Um músculo: uma saliência suave numa direção da seção, num trecho do comprimento. */
export interface Bulge {
  /** Direção na seção, no mesmo ângulo de `sectionPoint` (veja abaixo). */
  angle: number;
  /** Largura da saliência em volta do membro, em radianos. */
  spread: number;
  /** Quanto a pele sobe, em proporção do raio (0,07 = 7%). */
  amount: number;
  /** Trecho (de 0 = distal a 1 = proximal) em que a saliência cresce de zero até o máximo. */
  rise: [number, number];
  /** Trecho em que ela volta a zero. Sem `fall`, ela vai até o fim do membro. */
  fall?: [number, number];
}

export interface LimbShape {
  /** Onde fica a parte mais grossa, de 0 (distal) a 1 (proximal). */
  peakT: number;
  /** Largura ÷ espessura da seção na ponta distal e na proximal. 1 = redonda. */
  flatness: [number, number];
  bulges: Bulge[];
  /**
   * Gira a seção para a costura da textura cair num lugar pouco tatuado. Com 0, a costura fica
   * na direção -y (no antebraço, o lado do mindinho).
   */
  seamOffset: number;
  /** Comprimento das pontas arredondadas, em proporção do raio, na ponta distal e na proximal. */
  capLength: [number, number];
}

export interface LimbResolution {
  /** Quantos pedaços em volta do membro. */
  radialSegments: number;
  /** Quantos pedaços ao longo do membro (sem contar as pontas arredondadas). */
  lengthSegments: number;
  /** Quantos anéis em cada ponta arredondada. */
  capSegments: number;
}

const DEFAULT_RESOLUTION: LimbResolution = {
  radialSegments: 128,
  lengthSegments: 160,
  capSegments: 12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Transição suave de 0 a 1 (começa e termina devagar, sem "quinas" na forma). */
function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Prende cada medida dentro dos limites aceitos. */
export function clampLimb(m: LimbMeasurements, limits: MeasurementLimits): LimbMeasurements {
  return {
    lengthCm: clamp(m.lengthCm, limits.lengthCm.min, limits.lengthCm.max),
    distalCm: clamp(m.distalCm, limits.distalCm.min, limits.distalCm.max),
    peakCm: clamp(m.peakCm, limits.peakCm.min, limits.peakCm.max),
    proximalCm: clamp(m.proximalCm, limits.proximalCm.min, limits.proximalCm.max),
  };
}

/**
 * Circunferência, em centímetros, na posição `t` (0 = distal, 1 = proximal).
 *
 * O perfil sai da ponta distal, chega ao mais grosso em `peakT` e vai até a ponta proximal,
 * sempre com transições suaves. As três medidas são respeitadas exatamente nos pontos 0,
 * `peakT` e 1.
 */
export function limbCircumferenceAt(m: LimbMeasurements, peakT: number, t: number): number {
  if (t <= peakT) {
    return m.distalCm + (m.peakCm - m.distalCm) * smoothstep(t / peakT);
  }
  return m.peakCm + (m.proximalCm - m.peakCm) * smoothstep((t - peakT) / (1 - peakT));
}

/** Perímetro de um polígono fechado. */
export function perimeter(points: readonly (readonly [number, number])[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i] ?? [0, 0];
    const [x1, y1] = points[(i + 1) % points.length] ?? [0, 0];
    total += Math.hypot(x1 - x0, y1 - y0);
  }
  return total;
}

/** Peso de uma saliência na posição `t` do comprimento (0 fora do trecho, 1 no auge). */
function bulgeAlong(bulge: Bulge, t: number): number {
  const [r0, r1] = bulge.rise;
  const up = smoothstep((t - r0) / (r1 - r0));
  if (!bulge.fall) return up;
  const [f0, f1] = bulge.fall;
  return up * (1 - smoothstep((t - f0) / (f1 - f0)));
}

/**
 * Um ponto da seção, para uma seção de "tamanho 1" (antes de acertar a circunferência).
 *
 * O ângulo `a` dá a volta no membro. As direções, nos eixos da cena (membro deitado ao longo de
 * x, com o lado virado para a câmera em +z):
 *   a = 0      → y negativo
 *   a = π/2    → z positivo (de frente para a câmera)
 *   a = π      → y positivo
 *   a = 3π/2   → z negativo
 */
function sectionPoint(shape: LimbShape, t: number, a: number): [number, number] {
  const [f0, f1] = shape.flatness;
  const flatness = f0 + (f1 - f0) * smoothstep(t);
  let scale = 1;
  for (const bulge of shape.bulges) {
    let distance = Math.abs(a - bulge.angle) % (2 * Math.PI);
    distance = Math.min(distance, 2 * Math.PI - distance);
    scale +=
      bulge.amount *
      bulgeAlong(bulge, t) *
      Math.exp(-(distance * distance) / (2 * bulge.spread * bulge.spread));
  }
  return [-flatness * Math.cos(a) * scale, Math.sin(a) * scale];
}

/**
 * Gera a malha de um membro.
 *
 * O membro fica deitado ao longo do eixo x, centrado na origem: a ponta distal em x negativo e a
 * proximal em x positivo.
 *
 * A malha é uma grade: cada linha é um anel em volta do membro, e cada coluna é um ponto do anel.
 * A primeira e a última coluna ficam no mesmo lugar (a costura), com u = 0 e u = 1.
 * Nas pontas, os anéis vão encolhendo até um ponto, formando uma tampa arredondada.
 */
export function buildLimb(
  shape: LimbShape,
  m: LimbMeasurements,
  resolution: Partial<LimbResolution> = {},
): MeshData {
  const { radialSegments, lengthSegments, capSegments } = { ...DEFAULT_RESOLUTION, ...resolution };
  const length = m.lengthCm / 100;
  const columns = radialSegments + 1;
  const angleOf = (col: number): number => (col / radialSegments) * 2 * Math.PI + shape.seamOffset;

  /** A seção de tamanho certo em `t`: pontos (y, z) em metros, um por coluna (sem repetir). */
  const section = (t: number): [number, number][] => {
    const unit: [number, number][] = [];
    for (let j = 0; j < radialSegments; j++) unit.push(sectionPoint(shape, t, angleOf(j)));
    const scale = limbCircumferenceAt(m, shape.peakT, t) / 100 / perimeter(unit);
    return unit.map(([y, z]) => [y * scale, z * scale]);
  };

  // Cada anel: posição x e os pontos (y, z). Anéis de raio zero são as pontas das tampas.
  const rings: { x: number; points: [number, number][] }[] = [];
  const distal = section(0);
  const proximal = section(1);
  const distalCap = (shape.capLength[0] * (m.distalCm / 100)) / (2 * Math.PI);
  const proximalCap = (shape.capLength[1] * (m.proximalCm / 100)) / (2 * Math.PI);

  for (let k = capSegments; k >= 1; k--) {
    const angle = (k / capSegments) * (Math.PI / 2);
    const shrink = Math.cos(angle);
    rings.push({
      x: -length / 2 - distalCap * Math.sin(angle),
      points: distal.map(([y, z]) => [y * shrink, z * shrink]),
    });
  }
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    rings.push({ x: -length / 2 + t * length, points: section(t) });
  }
  for (let k = 1; k <= capSegments; k++) {
    const angle = (k / capSegments) * (Math.PI / 2);
    const shrink = Math.cos(angle);
    rings.push({
      x: length / 2 + proximalCap * Math.sin(angle),
      points: proximal.map(([y, z]) => [y * shrink, z * shrink]),
    });
  }

  const rowCount = rings.length;
  const vertexCount = rowCount * columns;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  const pointOf = (row: number, col: number): [number, number, number] => {
    const ring = rings[row];
    const c = ((col % radialSegments) + radialSegments) % radialSegments;
    const [y, z] = ring?.points[c] ?? [0, 0];
    return [ring?.x ?? 0, y, z];
  };

  // v acompanha a distância ao longo do lado virado para a câmera (o mais tatuado), para os
  // pixels da textura terem o mesmo tamanho na pele ao longo do comprimento.
  const front = Math.round(((Math.PI / 2 - shape.seamOffset) / (2 * Math.PI)) * radialSegments);
  const distances = [0];
  for (let row = 1; row < rowCount; row++) {
    const [x0, y0, z0] = pointOf(row - 1, front);
    const [x1, y1, z1] = pointOf(row, front);
    distances.push((distances[row - 1] ?? 0) + Math.hypot(x1 - x0, y1 - y0, z1 - z0));
  }
  const total = distances[rowCount - 1] ?? 1;

  /**
   * Normal por diferenças: as direções "ao longo" e "em volta" no vértice, e a perpendicular às
   * duas. Como os vizinhos dão a volta pela costura, a luz não mostra nenhuma linha ali. Nas
   * pontas das tampas, a normal aponta ao longo do eixo.
   */
  const normalAt = (row: number, col: number): [number, number, number] => {
    if (row === 0) return [-1, 0, 0];
    if (row === rowCount - 1) return [1, 0, 0];
    const [ax, ay, az] = pointOf(row + 1, col);
    const [bx, by, bz] = pointOf(row - 1, col);
    const [cx, cy, cz] = pointOf(row, col + 1);
    const [dx, dy, dz] = pointOf(row, col - 1);
    const along = [ax - bx, ay - by, az - bz] as const;
    const around = [cx - dx, cy - dy, cz - dz] as const;
    // "around" gira de -y para +z (veja sectionPoint); along × around aponta para fora.
    const nx = along[1] * around[2] - along[2] * around[1];
    const ny = along[2] * around[0] - along[0] * around[2];
    const nz = along[0] * around[1] - along[1] * around[0];
    const size = Math.hypot(nx, ny, nz) || 1;
    return [nx / size, ny / size, nz / size];
  };

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      positions.set(pointOf(row, col), index * 3);
      uvs.set([col / radialSegments, (distances[row] ?? 0) / total], index * 2);
      normals.set(normalAt(row, col), index * 3);
    }
  }

  // Dois triângulos por quadrado da grade, em sentido anti-horário vistos de fora.
  const indices = new Uint32Array((rowCount - 1) * radialSegments * 6);
  let n = 0;
  for (let row = 0; row < rowCount - 1; row++) {
    for (let col = 0; col < radialSegments; col++) {
      const a = row * columns + col;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], n);
      n += 6;
    }
  }

  return { positions, normals, uvs, indices };
}
