import { describe, expect, it } from 'vitest';
import { limbCircumferenceAt, perimeter } from './limb';
import { BODY_PART_ORDER, BODY_PARTS, buildBodyPart, clampBodyMeasurements } from './parts';
import type { BodyPartId } from './parts';
import type { MeshData } from './mesh-data';

const RES = { radialSegments: 64, lengthSegments: 40, capSegments: 6 };
const columns = RES.radialSegments + 1;
const firstRow = RES.capSegments; // primeiro anel depois da tampa distal
const lastRow = RES.capSegments + RES.lengthSegments;
const rowAt = (t: number) => firstRow + Math.round(t * RES.lengthSegments);

function vertex(data: Float32Array, index: number, size = 3): number[] {
  return Array.from(data.subarray(index * size, index * size + size));
}

function ring(m: MeshData, row: number): [number, number][] {
  const points: [number, number][] = [];
  for (let col = 0; col < RES.radialSegments; col++) {
    const [, y = 0, z = 0] = vertex(m.positions, row * columns + col);
    points.push([y, z]);
  }
  return points;
}

const ringCm = (m: MeshData, row: number) => perimeter(ring(m, row)) * 100;
/** Quanto o anel vai longe numa direção (y, z) de tamanho 1. */
const reach = (m: MeshData, row: number, dy: number, dz: number) =>
  Math.max(...ring(m, row).map(([y, z]) => y * dy + z * dz));

describe.each(BODY_PART_ORDER)('%s', (id: BodyPartId) => {
  const part = BODY_PARTS[id];
  const d = part.defaults;
  const mesh = buildBodyPart(id, d, RES);

  it('as medidas padrão estão dentro dos limites', () => {
    expect(clampBodyMeasurements(id, d)).toEqual(d);
  });

  it('o perfil respeita exatamente as três circunferências', () => {
    expect(limbCircumferenceAt(d, part.shape.peakT, 0)).toBe(d.distalCm);
    expect(limbCircumferenceAt(d, part.shape.peakT, part.shape.peakT)).toBe(d.peakCm);
    expect(limbCircumferenceAt(d, part.shape.peakT, 1)).toBe(d.proximalCm);
  });

  it('a circunferência da malha bate com as medidas', () => {
    expect(ringCm(mesh, firstRow)).toBeCloseTo(d.distalCm, 1);
    expect(ringCm(mesh, rowAt(part.shape.peakT))).toBeCloseTo(d.peakCm, 0);
    expect(ringCm(mesh, lastRow)).toBeCloseTo(d.proximalCm, 1);
  });

  it('o comprimento bate com a medida', () => {
    const [x0 = 0] = vertex(mesh.positions, firstRow * columns);
    const [x1 = 0] = vertex(mesh.positions, lastRow * columns);
    expect((x1 - x0) * 100).toBeCloseTo(d.lengthCm, 5);
  });

  it('todo UV fica entre 0 e 1, e as colunas da costura coincidem', () => {
    for (const value of mesh.uvs) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    const row = rowAt(0.4);
    expect(vertex(mesh.positions, row * columns)).toEqual(
      vertex(mesh.positions, row * columns + RES.radialSegments),
    );
    expect(vertex(mesh.normals, row * columns)).toEqual(
      vertex(mesh.normals, row * columns + RES.radialSegments),
    );
  });

  it('as normais têm tamanho 1 e apontam para fora', () => {
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const [nx = 0, ny = 0, nz = 0] = vertex(mesh.normals, i);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5);
      const [, y = 0, z = 0] = vertex(mesh.positions, i);
      if (Math.hypot(y, z) > 0.005) expect(ny * y + nz * z).toBeGreaterThan(0);
    }
  });

  it('os triângulos estão de frente para fora', () => {
    let checked = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a = 0, b = 0, c = 0] = mesh.indices.subarray(t, t + 3);
      const [ax = 0, ay = 0, az = 0] = vertex(mesh.positions, a);
      const [bx = 0, by = 0, bz = 0] = vertex(mesh.positions, b);
      const [cx = 0, cy = 0, cz = 0] = vertex(mesh.positions, c);
      const e1 = [bx - ax, by - ay, bz - az] as const;
      const e2 = [cx - ax, cy - ay, cz - az] as const;
      const face = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ] as const;
      if (Math.hypot(...face) < 1e-10) continue; // ponta da tampa
      const [nx = 0, ny = 0, nz = 0] = vertex(mesh.normals, a);
      expect(face[0] * nx + face[1] * ny + face[2] * nz).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('medidas maiores geram um membro mais grosso e mais comprido', () => {
    const big = buildBodyPart(
      id,
      {
        lengthCm: d.lengthCm + 6,
        distalCm: d.distalCm + 4,
        peakCm: d.peakCm + 6,
        proximalCm: d.proximalCm + 4,
      },
      RES,
    );
    expect(ringCm(big, firstRow)).toBeCloseTo(d.distalCm + 4, 1);
    const [x0 = 0] = vertex(big.positions, firstRow * columns);
    expect(x0 * 100).toBeCloseTo(-(d.lengthCm + 6) / 2, 5);
  });

  it('medidas fora dos limites são presas', () => {
    const tiny = clampBodyMeasurements(id, {
      lengthCm: 1,
      distalCm: 1,
      peakCm: 999,
      proximalCm: 999,
    });
    expect(tiny.lengthCm).toBe(part.limits.lengthCm.min);
    expect(tiny.peakCm).toBe(part.limits.peakCm.max);
  });
});

describe('antebraço', () => {
  const mesh = buildBodyPart('forearm', BODY_PARTS.forearm.defaults, RES);

  it('o punho é mais largo que grosso', () => {
    const width = reach(mesh, firstRow, 1, 0);
    const thickness = reach(mesh, firstRow, 0, 1);
    expect(width / thickness).toBeGreaterThan(1.3);
  });

  it('a costura fica no lado do mindinho (y negativo)', () => {
    const [, y = 0, z = 0] = vertex(mesh.positions, rowAt(0.5) * columns);
    expect(y).toBeLessThan(0);
    expect(Math.abs(z)).toBeLessThan(1e-6);
  });
});

describe('braço', () => {
  const mesh = buildBodyPart('upperArm', BODY_PARTS.upperArm.defaults, RES);

  it('o bíceps (frente, y positivo) é mais saliente que o tríceps no meio do braço', () => {
    const row = rowAt(0.45);
    expect(reach(mesh, row, 1, 0)).toBeGreaterThan(reach(mesh, row, -1, 0));
  });

  it('o deltoide arredonda o lado de fora no alto do braço', () => {
    // Lado de fora (z positivo) em relação ao lado de dentro: mais saliente no alto que no meio.
    const ratio = (row: number) => reach(mesh, row, 0, 1) / reach(mesh, row, 0, -1);
    expect(ratio(rowAt(0.95))).toBeGreaterThan(ratio(rowAt(0.45)) + 0.05);
  });

  it('perto do cotovelo, a seção é mais larga de um lado ao outro', () => {
    expect(reach(mesh, firstRow, 0, 1)).toBeGreaterThan(reach(mesh, firstRow, 1, 0));
  });

  it('a costura fica atrás e por dentro (y e z negativos)', () => {
    const [, y = 0, z = 0] = vertex(mesh.positions, rowAt(0.5) * columns);
    const size = Math.hypot(y, z);
    expect(y / size).toBeLessThan(-0.5);
    expect(z / size).toBeLessThan(-0.5);
  });
});
