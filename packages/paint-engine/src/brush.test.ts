import { describe, expect, it } from 'vitest';
import { brushRadius, uvScaleFromTriangle } from './brush';

describe('brushRadius', () => {
  it('usa o raio inteiro com pressão máxima', () => {
    expect(brushRadius(4, 1)).toBe(4);
  });

  it('usa a fração mínima com pressão zero', () => {
    expect(brushRadius(4, 0, 0.25)).toBe(1);
  });

  it('cresce linearmente entre os dois', () => {
    expect(brushRadius(10, 0.5, 0)).toBe(5);
  });

  it('ignora pressões fora de 0..1', () => {
    expect(brushRadius(4, 3)).toBe(4);
    expect(brushRadius(4, -1, 0.5)).toBe(2);
  });
});

describe('uvScaleFromTriangle', () => {
  const origin = { x: 0, y: 0, z: 0 };

  it('com UV igual à posição, 1 unidade de UV vale 1 unidade do mundo', () => {
    const s = uvScaleFromTriangle(
      origin,
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    );
    expect(s).toEqual({ u: 1, v: 1 });
  });

  it('mede o esticamento diferente em cada direção', () => {
    // O triângulo tem 2 m de largura e 0,5 m de altura, mas ocupa 0..1 de UV nos dois eixos.
    const s = uvScaleFromTriangle(
      origin,
      { x: 2, y: 0, z: 0 },
      { x: 0, y: 0.5, z: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    );
    expect(s?.u).toBeCloseTo(2);
    expect(s?.v).toBeCloseTo(0.5);
  });

  it('não depende da orientação do triângulo no espaço', () => {
    // Mesmo triângulo do primeiro teste, deitado no plano XZ.
    const s = uvScaleFromTriangle(
      origin,
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    );
    expect(s?.u).toBeCloseTo(1);
    expect(s?.v).toBeCloseTo(1);
  });

  it('devolve null quando o UV do triângulo não tem área', () => {
    const s = uvScaleFromTriangle(
      origin,
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    );
    expect(s).toBeNull();
  });
});
