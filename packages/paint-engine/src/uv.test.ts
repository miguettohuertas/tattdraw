import { describe, expect, it } from 'vitest';
import { uvToPixel } from './uv';

describe('uvToPixel', () => {
  it('leva o canto inferior esquerdo do UV ao canto inferior esquerdo do canvas', () => {
    expect(uvToPixel({ u: 0, v: 0 }, 4096, 4096)).toEqual({ x: 0, y: 4096 });
  });

  it('leva o canto superior direito do UV ao canto superior direito do canvas', () => {
    expect(uvToPixel({ u: 1, v: 1 }, 4096, 4096)).toEqual({ x: 4096, y: 0 });
  });

  it('leva o centro ao centro, também em texturas não quadradas', () => {
    expect(uvToPixel({ u: 0.5, v: 0.5 }, 2048, 1024)).toEqual({ x: 1024, y: 512 });
  });

  it('prende valores fora de 0..1 na borda da textura', () => {
    expect(uvToPixel({ u: -0.2, v: 1.3 }, 100, 100)).toEqual({ x: 0, y: 0 });
  });

  it('recusa tamanho zero', () => {
    expect(() => uvToPixel({ u: 0, v: 0 }, 0, 100)).toThrow(RangeError);
  });
});
