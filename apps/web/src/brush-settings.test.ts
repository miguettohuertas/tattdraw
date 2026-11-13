import { describe, expect, it } from 'vitest';
import { clampSize, DEFAULT_SETTINGS, formatSize, stepSize, toViewerBrush } from './brush-settings';

describe('toViewerBrush', () => {
  it('converte o diâmetro em milímetros no raio em metros', () => {
    expect(toViewerBrush(DEFAULT_SETTINGS)).toEqual({
      tool: 'pen',
      color: '#1a1a1a',
      radius: 0.0025,
    });
  });

  it('usa o tamanho da ferramenta ativa', () => {
    const brush = toViewerBrush({ ...DEFAULT_SETTINGS, tool: 'eraser' });
    expect(brush.tool).toBe('eraser');
    expect(brush.radius).toBeCloseTo(0.006);
  });
});

describe('clampSize', () => {
  it('prende entre 0,5 e 30 mm', () => {
    expect(clampSize(0)).toBe(0.5);
    expect(clampSize(99)).toBe(30);
  });

  it('alinha ao passo de 0,5 mm', () => {
    expect(clampSize(3.3)).toBe(3.5);
  });
});

describe('stepSize', () => {
  it('anda de 0,5 em 0,5 mm nos tamanhos pequenos', () => {
    expect(stepSize(2, 1)).toBe(2.5);
    expect(stepSize(2, -1)).toBe(1.5);
  });

  it('anda mais rápido nos tamanhos grandes', () => {
    expect(stepSize(5, 1)).toBe(6);
    expect(stepSize(10, 1)).toBe(12);
  });

  it('subir e descer volta ao mesmo tamanho', () => {
    for (const size of [0.5, 4.5, 5, 9, 10, 28]) {
      expect(stepSize(stepSize(size, 1), -1)).toBe(size);
    }
  });

  it('não passa dos limites', () => {
    expect(stepSize(0.5, -1)).toBe(0.5);
    expect(stepSize(30, 1)).toBe(30);
  });
});

describe('formatSize', () => {
  it('usa vírgula decimal', () => {
    expect(formatSize(2.5)).toBe('2,5 mm');
    expect(formatSize(12)).toBe('12 mm');
  });
});
