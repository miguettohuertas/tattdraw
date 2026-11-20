import { describe, expect, it } from 'vitest';
import {
  buildForearm,
  circumferenceAt,
  clampMeasurements,
  DEFAULT_FOREARM,
  perimeter,
} from './forearm';
import type { MeshData } from './mesh-data';

const RES = { radialSegments: 64, lengthSegments: 40, capSegments: 6 };
const mesh = buildForearm(DEFAULT_FOREARM, RES);
const columns = RES.radialSegments + 1;

function vertex(data: Float32Array, index: number, size = 3): number[] {
  return Array.from(data.subarray(index * size, index * size + size));
}

/** Circunferência medida na malha, no anel `row` (soma das distâncias entre vizinhos). */
function ringCircumferenceCm(m: MeshData, row: number): number {
  const points: [number, number][] = [];
  for (let col = 0; col < RES.radialSegments; col++) {
    const [, y = 0, z = 0] = vertex(m.positions, row * columns + col);
    points.push([y, z]);
  }
  return perimeter(points) * 100;
}

describe('circumferenceAt', () => {
  it('respeita exatamente as três medidas', () => {
    expect(circumferenceAt(DEFAULT_FOREARM, 0)).toBe(16);
    expect(circumferenceAt(DEFAULT_FOREARM, 0.7)).toBe(26);
    expect(circumferenceAt(DEFAULT_FOREARM, 1)).toBe(24);
  });

  it('muda sem saltos ao longo do braço', () => {
    for (let t = 0; t < 1; t += 0.01) {
      const step = Math.abs(
        circumferenceAt(DEFAULT_FOREARM, t + 0.01) - circumferenceAt(DEFAULT_FOREARM, t),
      );
      expect(step).toBeLessThan(0.3);
    }
  });
});

describe('clampMeasurements', () => {
  it('prende medidas fora dos limites', () => {
    const m = clampMeasurements({ lengthCm: 5, wristCm: 99, forearmCm: 26, elbowCm: 24 });
    expect(m.lengthCm).toBe(16);
    expect(m.wristCm).toBe(24);
  });
});

describe('buildForearm', () => {
  const firstArmRow = RES.capSegments; // depois da tampa do punho
  const lastArmRow = RES.capSegments + RES.lengthSegments;

  it('tem a quantidade esperada de vértices e triângulos', () => {
    const rows = RES.lengthSegments + 1 + 2 * RES.capSegments;
    expect(mesh.positions.length).toBe(rows * columns * 3);
    expect(mesh.indices.length).toBe((rows - 1) * RES.radialSegments * 6);
  });

  it('a circunferência da malha bate com as medidas do tatuador', () => {
    expect(ringCircumferenceCm(mesh, firstArmRow)).toBeCloseTo(16, 1);
    expect(ringCircumferenceCm(mesh, firstArmRow + 0.7 * RES.lengthSegments)).toBeCloseTo(26, 1);
    expect(ringCircumferenceCm(mesh, lastArmRow)).toBeCloseTo(24, 1);
  });

  it('o comprimento do punho ao cotovelo bate com a medida', () => {
    const [xWrist = 0] = vertex(mesh.positions, firstArmRow * columns);
    const [xElbow = 0] = vertex(mesh.positions, lastArmRow * columns);
    expect((xElbow - xWrist) * 100).toBeCloseTo(26, 5);
  });

  it('o punho é mais largo que grosso', () => {
    let maxY = 0;
    let maxZ = 0;
    for (let col = 0; col < RES.radialSegments; col++) {
      const [, y = 0, z = 0] = vertex(mesh.positions, firstArmRow * columns + col);
      maxY = Math.max(maxY, Math.abs(y));
      maxZ = Math.max(maxZ, Math.abs(z));
    }
    expect(maxY / maxZ).toBeGreaterThan(1.3);
  });

  it('todo UV fica entre 0 e 1, com a costura em u = 0 e u = 1', () => {
    for (const value of mesh.uvs) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    const row = firstArmRow + 10;
    expect(vertex(mesh.uvs, row * columns, 2)[0]).toBe(0);
    expect(vertex(mesh.uvs, row * columns + RES.radialSegments, 2)[0]).toBe(1);
    // As duas colunas da costura ficam no mesmo lugar e com a mesma normal.
    expect(vertex(mesh.positions, row * columns)).toEqual(
      vertex(mesh.positions, row * columns + RES.radialSegments),
    );
    expect(vertex(mesh.normals, row * columns)).toEqual(
      vertex(mesh.normals, row * columns + RES.radialSegments),
    );
  });

  it('a costura fica no lado do mindinho (y negativo)', () => {
    const [, y = 0, z = 0] = vertex(mesh.positions, (firstArmRow + 20) * columns);
    expect(y).toBeLessThan(0);
    expect(Math.abs(z)).toBeLessThan(1e-6);
  });

  it('as normais têm tamanho 1 e apontam para fora', () => {
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const [nx = 0, ny = 0, nz = 0] = vertex(mesh.normals, i);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5);
      const [, y = 0, z = 0] = vertex(mesh.positions, i);
      if (Math.hypot(y, z) > 0.005) expect(ny * y + nz * z).toBeGreaterThan(0);
    }
  });

  it('os triângulos estão de frente para fora (sentido anti-horário)', () => {
    let checked = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a = 0, b = 0, c = 0] = mesh.indices.subarray(t, t + 3);
      const [ax = 0, ay = 0, az = 0] = vertex(mesh.positions, a);
      const [bx = 0, by = 0, bz = 0] = vertex(mesh.positions, b);
      const [cx = 0, cy = 0, cz = 0] = vertex(mesh.positions, c);
      const e1 = [bx - ax, by - ay, bz - az];
      const e2 = [cx - ax, cy - ay, cz - az];
      const face = [
        (e1[1] ?? 0) * (e2[2] ?? 0) - (e1[2] ?? 0) * (e2[1] ?? 0),
        (e1[2] ?? 0) * (e2[0] ?? 0) - (e1[0] ?? 0) * (e2[2] ?? 0),
        (e1[0] ?? 0) * (e2[1] ?? 0) - (e1[1] ?? 0) * (e2[0] ?? 0),
      ];
      if (Math.hypot(face[0] ?? 0, face[1] ?? 0, face[2] ?? 0) < 1e-10) continue; // ponta da tampa
      const [nx = 0, ny = 0, nz = 0] = vertex(mesh.normals, a);
      expect((face[0] ?? 0) * nx + (face[1] ?? 0) * ny + (face[2] ?? 0) * nz).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('medidas maiores geram um braço mais grosso e mais comprido', () => {
    const big = buildForearm({ lengthCm: 32, wristCm: 20, forearmCm: 34, elbowCm: 30 }, RES);
    expect(ringCircumferenceCm(big, firstArmRow)).toBeCloseTo(20, 1);
    const [xWrist = 0] = vertex(big.positions, firstArmRow * columns);
    expect(xWrist * 100).toBeCloseTo(-16, 5);
  });
});
