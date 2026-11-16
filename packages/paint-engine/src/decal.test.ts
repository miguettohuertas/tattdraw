import { describe, expect, it } from 'vitest';
import { fitWithin, hasTransparency, layerNameFromFile, surfaceFrame, whiteToAlpha } from './decal';
import type { Vec3 } from './brush';

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
const expectVec = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x);
  expect(a.y).toBeCloseTo(b.y);
  expect(a.z).toBeCloseTo(b.z);
};

describe('surfaceFrame', () => {
  it('olhando a pele de frente, a imagem fica em pé', () => {
    const f = surfaceFrame({ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 });
    expectVec(f.up, { x: 0, y: 1, z: 0 });
    expectVec(f.right, { x: 1, y: 0, z: 0 });
    expectVec(f.normal, { x: 0, y: 0, z: 1 });
  });

  it('os três eixos são perpendiculares e de tamanho 1, mesmo com dicas tortas', () => {
    const f = surfaceFrame({ x: 1, y: 2, z: 3 }, { x: 0.3, y: 1, z: -0.2 }, 0.7);
    for (const v of [f.right, f.up, f.normal]) expect(len(v)).toBeCloseTo(1);
    expect(dot(f.right, f.up)).toBeCloseTo(0);
    expect(dot(f.right, f.normal)).toBeCloseTo(0);
    expect(dot(f.up, f.normal)).toBeCloseTo(0);
  });

  it('usa a sombra da dica sobre a pele quando ela está inclinada', () => {
    const f = surfaceFrame({ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 1 });
    expectVec(f.up, { x: 0, y: 1, z: 0 });
  });

  it('gira a imagem no sentido anti-horário', () => {
    const f = surfaceFrame({ x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 0 }, Math.PI / 2);
    expectVec(f.right, { x: 0, y: 1, z: 0 });
    expectVec(f.up, { x: -1, y: 0, z: 0 });
  });

  it('com a dica paralela à normal, usa o eixo de reserva', () => {
    const f = surfaceFrame({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 0, { x: 0, y: 0, z: -1 });
    expectVec(f.up, { x: 0, y: 0, z: -1 });
  });
});

describe('whiteToAlpha', () => {
  const run = (...pixels: number[][]) => {
    const data = new Uint8ClampedArray(pixels.flat());
    whiteToAlpha(data);
    return Array.from(data);
  };

  it('branco some e preto continua preto e opaco', () => {
    expect(run([255, 255, 255, 255], [0, 0, 0, 255])).toEqual([255, 255, 255, 0, 0, 0, 0, 255]);
  });

  it('cinza vira preto semitransparente', () => {
    const [r, g, b, a] = run([128, 128, 128, 255]);
    expect([r, g, b]).toEqual([0, 0, 0]);
    expect(a).toBe(127);
  });

  it('vermelho puro continua vermelho e opaco', () => {
    expect(run([255, 0, 0, 255])).toEqual([255, 0, 0, 255]);
  });

  it('sobre fundo branco, o resultado tem a mesma aparência do original', () => {
    const original = [200, 120, 60];
    const [r = 0, g = 0, b = 0, a = 0] = run([...original, 255]);
    const over = (c: number) => (c * a + 255 * (255 - a)) / 255;
    expect(Math.abs(over(r) - 200)).toBeLessThanOrEqual(2);
    expect(Math.abs(over(g) - 120)).toBeLessThanOrEqual(2);
    expect(Math.abs(over(b) - 60)).toBeLessThanOrEqual(2);
  });

  it('respeita a transparência que o pixel já tinha', () => {
    expect(run([0, 0, 0, 100])[3]).toBe(100);
  });
});

describe('hasTransparency', () => {
  it('detecta imagem toda opaca e imagem com transparência', () => {
    expect(hasTransparency(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]))).toBe(false);
    expect(hasTransparency(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]))).toBe(true);
  });
});

describe('fitWithin', () => {
  it('não mexe em imagens pequenas', () => {
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it('reduz pelo lado maior mantendo a proporção', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(1000, 5000, 2000)).toEqual({ width: 400, height: 2000 });
  });
});

describe('layerNameFromFile', () => {
  it('tira a extensão', () => {
    expect(layerNameFromFile('rosa final.png')).toBe('rosa final');
    expect(layerNameFromFile('flash.v2.JPG')).toBe('flash.v2');
  });

  it('encurta nomes compridos', () => {
    expect(layerNameFromFile('um nome de arquivo muito comprido mesmo.png', 12)).toBe(
      'um nome de …',
    );
  });

  it('usa "Imagem" quando não sobra nome', () => {
    expect(layerNameFromFile('.png')).toBe('Imagem');
  });
});
