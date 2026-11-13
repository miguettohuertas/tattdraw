import { describe, expect, it } from 'vitest';
import { includeEllipse, toPixelRect } from './dirty-rect';

describe('includeEllipse', () => {
  it('começa com os limites da primeira elipse', () => {
    expect(includeEllipse(null, 10, 20, 3, 5)).toEqual({ minX: 7, minY: 15, maxX: 13, maxY: 25 });
  });

  it('cresce para abraçar uma elipse nova', () => {
    const first = includeEllipse(null, 10, 10, 2, 2);
    expect(includeEllipse(first, 30, 5, 2, 2)).toEqual({ minX: 8, minY: 3, maxX: 32, maxY: 12 });
  });

  it('não encolhe quando a elipse nova já está dentro', () => {
    const first = includeEllipse(null, 10, 10, 5, 5);
    expect(includeEllipse(first, 10, 10, 1, 1)).toEqual(first);
  });
});

describe('toPixelRect', () => {
  it('arredonda para fora e acrescenta a margem', () => {
    const rect = toPixelRect({ minX: 10.4, minY: 20.6, maxX: 12.2, maxY: 22.1 }, 100, 100);
    expect(rect).toEqual({ x: 9, y: 19, width: 5, height: 5 });
  });

  it('prende o retângulo dentro da textura', () => {
    const rect = toPixelRect({ minX: -5, minY: 90, maxX: 4, maxY: 120 }, 100, 100);
    expect(rect).toEqual({ x: 0, y: 89, width: 5, height: 11 });
  });

  it('devolve null quando tudo ficou fora da textura', () => {
    expect(toPixelRect({ minX: 200, minY: 200, maxX: 210, maxY: 210 }, 100, 100)).toBeNull();
  });
});
