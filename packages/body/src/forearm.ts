import type { MeshData } from './mesh-data';

/**
 * Antebraço gerado a partir de medidas, como as que o tatuador tira do cliente com uma fita.
 *
 * Todas as medidas em centímetros:
 * - `lengthCm`: do punho até a dobra do cotovelo;
 * - `wristCm`: circunferência do punho, logo acima do osso;
 * - `forearmCm`: circunferência na parte mais grossa (perto do cotovelo, onde fica o músculo);
 * - `elbowCm`: circunferência logo abaixo da dobra do cotovelo.
 */
export interface ForearmMeasurements {
  lengthCm: number;
  wristCm: number;
  forearmCm: number;
  elbowCm: number;
}

/** Medidas de um adulto médio, usadas ao abrir o app. */
export const DEFAULT_FOREARM: ForearmMeasurements = {
  lengthCm: 26,
  wristCm: 16,
  forearmCm: 26,
  elbowCm: 24,
};

/** Limites aceitos para cada medida, em centímetros. */
export const FOREARM_LIMITS: Record<keyof ForearmMeasurements, { min: number; max: number }> = {
  lengthCm: { min: 16, max: 36 },
  wristCm: { min: 11, max: 24 },
  forearmCm: { min: 16, max: 42 },
  elbowCm: { min: 16, max: 40 },
};

export interface ForearmResolution {
  /** Quantos pedaços em volta do braço. */
  radialSegments: number;
  /** Quantos pedaços ao longo do braço (sem contar as pontas arredondadas). */
  lengthSegments: number;
  /** Quantos anéis em cada ponta arredondada. */
  capSegments: number;
}

const DEFAULT_RESOLUTION: ForearmResolution = {
  radialSegments: 128,
  lengthSegments: 160,
  capSegments: 12,
};

/**
 * Forma da seção (o "corte" do braço, visto de frente), de 0 = punho a 1 = cotovelo.
 *
 * - `flatness`: largura ÷ espessura. O punho é achatado (bem mais largo que grosso); perto do
 *   cotovelo o braço é mais redondo.
 * - O músculo do lado de cima (o braquiorradial, que forma a "barriga" do antebraço) é uma
 *   saliência suave no lado do polegar, mais forte no terço perto do cotovelo.
 */
const WRIST_FLATNESS = 1.45;
const ELBOW_FLATNESS = 1.12;
const MUSCLE_AMOUNT = 0.07;
/** Direção do músculo na seção (veja `sectionPoint`): entre as costas do braço e o polegar. */
const MUSCLE_ANGLE = 0.72 * Math.PI;
const MUSCLE_SPREAD = 0.55;
/** Comprimento de cada ponta arredondada, em proporção do raio naquela ponta. */
const CAP_LENGTH = 0.6;

/** Prende um número entre um mínimo e um máximo. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Prende cada medida dentro dos limites aceitos. */
export function clampMeasurements(m: ForearmMeasurements): ForearmMeasurements {
  return {
    lengthCm: clamp(m.lengthCm, FOREARM_LIMITS.lengthCm.min, FOREARM_LIMITS.lengthCm.max),
    wristCm: clamp(m.wristCm, FOREARM_LIMITS.wristCm.min, FOREARM_LIMITS.wristCm.max),
    forearmCm: clamp(m.forearmCm, FOREARM_LIMITS.forearmCm.min, FOREARM_LIMITS.forearmCm.max),
    elbowCm: clamp(m.elbowCm, FOREARM_LIMITS.elbowCm.min, FOREARM_LIMITS.elbowCm.max),
  };
}

/** Transição suave de 0 a 1 (começa e termina devagar, sem "quinas" na forma). */
function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Circunferência, em centímetros, na posição `t` (0 = punho, 1 = cotovelo).
 *
 * O perfil sai do punho, alarga devagar no primeiro terço, chega ao mais grosso por volta de
 * 70% do comprimento e afina um pouco até o cotovelo. As três medidas do tatuador são
 * respeitadas exatamente nos pontos 0, 0,7 e 1.
 */
export function circumferenceAt(m: ForearmMeasurements, t: number): number {
  const peak = 0.7;
  if (t <= peak) {
    return m.wristCm + (m.forearmCm - m.wristCm) * smoothstep(t / peak);
  }
  return m.forearmCm + (m.elbowCm - m.forearmCm) * smoothstep((t - peak) / (1 - peak));
}

/**
 * Um ponto da seção, para uma seção de "tamanho 1" (antes de acertar a circunferência).
 *
 * `phi` dá a volta no braço. A costura da textura fica em `phi` = 0, no lado do mindinho, que é
 * o lugar menos tatuado; assim o encontro das pontas da textura não cai no meio de um desenho.
 *   phi = 0      → lado do mindinho (y negativo)
 *   phi = π/2    → costas do antebraço, virada para a câmera (z positivo)
 *   phi = π      → lado do polegar (y positivo)
 *   phi = 3π/2   → parte de dentro do antebraço (z negativo)
 */
function sectionPoint(t: number, phi: number): [number, number] {
  const flatness = WRIST_FLATNESS + (ELBOW_FLATNESS - WRIST_FLATNESS) * smoothstep(t);
  let distance = Math.abs(phi - MUSCLE_ANGLE);
  distance = Math.min(distance, 2 * Math.PI - distance);
  const muscleAlong = smoothstep((t - 0.2) / 0.5) * (1 - smoothstep((t - 0.85) / 0.15));
  const bulge =
    1 + MUSCLE_AMOUNT * muscleAlong * Math.exp(-(distance * distance) / (2 * MUSCLE_SPREAD ** 2));
  return [-flatness * Math.cos(phi) * bulge, Math.sin(phi) * bulge];
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

/**
 * Gera a malha do antebraço.
 *
 * O braço fica deitado ao longo do eixo x, centrado na origem: punho em x negativo, cotovelo
 * em x positivo, costas do braço viradas para +z (para a câmera).
 *
 * A malha é uma grade: cada linha é um anel em volta do braço, e cada coluna é um ponto do anel.
 * A primeira e a última coluna ficam no mesmo lugar (a costura), com u = 0 e u = 1.
 * Nas pontas, os anéis vão encolhendo até um ponto, formando uma tampa arredondada.
 */
export function buildForearm(
  measurements: ForearmMeasurements,
  resolution: Partial<ForearmResolution> = {},
): MeshData {
  const m = clampMeasurements(measurements);
  const { radialSegments, lengthSegments, capSegments } = { ...DEFAULT_RESOLUTION, ...resolution };
  const length = m.lengthCm / 100;
  const columns = radialSegments + 1;

  /** A seção de tamanho certo em `t`: pontos (y, z) em metros, um por coluna (sem repetir). */
  const section = (t: number): [number, number][] => {
    const unit: [number, number][] = [];
    for (let j = 0; j < radialSegments; j++) {
      unit.push(sectionPoint(t, (j / radialSegments) * 2 * Math.PI));
    }
    const scale = circumferenceAt(m, t) / 100 / perimeter(unit);
    return unit.map(([y, z]) => [y * scale, z * scale]);
  };

  // Cada anel: posição x e os pontos (y, z). Anéis de raio zero são as pontas das tampas.
  const rings: { x: number; points: [number, number][] }[] = [];

  const wrist = section(0);
  const elbow = section(1);
  const wristCap = (CAP_LENGTH * (m.wristCm / 100)) / (2 * Math.PI);
  const elbowCap = (CAP_LENGTH * (m.elbowCm / 100)) / (2 * Math.PI);

  // Tampa do punho, da ponta até encostar no braço.
  for (let k = capSegments; k >= 1; k--) {
    const angle = (k / capSegments) * (Math.PI / 2);
    const shrink = Math.cos(angle);
    rings.push({
      x: -length / 2 - wristCap * Math.sin(angle),
      points: wrist.map(([y, z]) => [y * shrink, z * shrink]),
    });
  }
  // O braço.
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    rings.push({ x: -length / 2 + t * length, points: section(t) });
  }
  // Tampa do cotovelo.
  for (let k = 1; k <= capSegments; k++) {
    const angle = (k / capSegments) * (Math.PI / 2);
    const shrink = Math.cos(angle);
    rings.push({
      x: length / 2 + elbowCap * Math.sin(angle),
      points: elbow.map(([y, z]) => [y * shrink, z * shrink]),
    });
  }

  const rowCount = rings.length;
  const vertexCount = rowCount * columns;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  const pointOf = (row: number, col: number): [number, number, number] => {
    const ring = rings[row];
    const [y, z] = ring?.points[col % radialSegments] ?? [0, 0];
    return [ring?.x ?? 0, y, z];
  };

  // v acompanha a distância ao longo das costas do braço (onde mais se tatua), para os pixels
  // da textura terem o mesmo tamanho na pele ao longo do comprimento.
  const dorsal = Math.round(radialSegments / 4);
  const distances = [0];
  for (let row = 1; row < rowCount; row++) {
    const [x0, y0, z0] = pointOf(row - 1, dorsal);
    const [x1, y1, z1] = pointOf(row, dorsal);
    distances.push((distances[row - 1] ?? 0) + Math.hypot(x1 - x0, y1 - y0, z1 - z0));
  }
  const total = distances[rowCount - 1] ?? 1;

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      const [x, y, z] = pointOf(row, col);
      positions.set([x, y, z], index * 3);
      uvs.set([col / radialSegments, (distances[row] ?? 0) / total], index * 2);
      normals.set(normalAt(row, col), index * 3);
    }
  }

  /**
   * Normal por diferenças: as direções "ao longo do braço" e "em volta do braço" no vértice,
   * e a perpendicular às duas. Como os vizinhos dão a volta pela costura, a luz não mostra
   * nenhuma linha ali. Nas pontas das tampas, a normal aponta ao longo do eixo.
   */
  function normalAt(row: number, col: number): [number, number, number] {
    if (row === 0) return [-1, 0, 0];
    if (row === rowCount - 1) return [1, 0, 0];
    const c = col % radialSegments;
    const [ax, ay, az] = pointOf(row + 1, c);
    const [bx, by, bz] = pointOf(row - 1, c);
    const [cx, cy, cz] = pointOf(row, c + 1);
    const [dx, dy, dz] = pointOf(row, c - 1 + radialSegments);
    const along = [ax - bx, ay - by, az - bz] as const;
    const around = [cx - dx, cy - dy, cz - dz] as const;
    // "around" gira de -y para +z (veja sectionPoint); along × around aponta para fora.
    let nx = along[1] * around[2] - along[2] * around[1];
    let ny = along[2] * around[0] - along[0] * around[2];
    let nz = along[0] * around[1] - along[1] * around[0];
    const size = Math.hypot(nx, ny, nz) || 1;
    nx /= size;
    ny /= size;
    nz /= size;
    return [nx, ny, nz];
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
