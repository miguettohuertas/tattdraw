import { describe, expect, it } from 'vitest';
import { interpolateStroke } from './stroke';

describe('interpolateStroke', () => {
  it('preenche um trecho longo com carimbos espaçados por igual', () => {
    const points = interpolateStroke({ x: 0, y: 0, pressure: 0 }, { x: 10, y: 0, pressure: 1 }, 2);
    expect(points.map((p) => p.x)).toEqual([2, 4, 6, 8, 10]);
  });

  it('interpola a pressão ao longo do trecho', () => {
    const points = interpolateStroke(
      { x: 0, y: 0, pressure: 0.2 },
      { x: 4, y: 0, pressure: 0.6 },
      2,
    );
    expect(points.map((p) => p.pressure)).toEqual([0.4, 0.6]);
  });

  it('sempre termina exatamente no ponto final', () => {
    const points = interpolateStroke({ x: 0, y: 0, pressure: 1 }, { x: 3, y: 4, pressure: 1 }, 2);
    expect(points.at(-1)).toEqual({ x: 3, y: 4, pressure: 1 });
  });

  it('devolve um ponto quando a caneta quase não andou', () => {
    const points = interpolateStroke(
      { x: 5, y: 5, pressure: 0.5 },
      { x: 5.1, y: 5, pressure: 0.5 },
      2,
    );
    expect(points).toHaveLength(1);
  });

  it('recusa espaçamento zero', () => {
    const p = { x: 0, y: 0, pressure: 1 };
    expect(() => interpolateStroke(p, p, 0)).toThrow(RangeError);
  });
});
