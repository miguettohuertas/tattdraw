import { describe, expect, it } from 'vitest';
import {
  activeIndexAfterRemoval,
  clampOpacity,
  moveItem,
  moveTarget,
  nextLayerName,
} from './layers';

describe('nextLayerName', () => {
  it('começa em "Camada 1"', () => {
    expect(nextLayerName([])).toBe('Camada 1');
  });

  it('usa o maior número já usado mais um', () => {
    expect(nextLayerName([{ name: 'Camada 1' }, { name: 'Camada 4' }])).toBe('Camada 5');
  });

  it('ignora nomes fora do padrão', () => {
    expect(nextLayerName([{ name: 'Contorno' }, { name: 'Camada 2' }])).toBe('Camada 3');
  });
});

describe('moveTarget', () => {
  it('sobe e desce uma posição', () => {
    expect(moveTarget(3, 1, 1)).toBe(2);
    expect(moveTarget(3, 1, -1)).toBe(0);
  });

  it('não sai da pilha', () => {
    expect(moveTarget(3, 2, 1)).toBe(2);
    expect(moveTarget(3, 0, -1)).toBe(0);
  });
});

describe('moveItem', () => {
  it('move um item sem alterar a lista original', () => {
    const original = ['a', 'b', 'c'];
    expect(moveItem(original, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(original).toEqual(['a', 'b', 'c']);
  });

  it('mover para o mesmo lugar não muda nada', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('activeIndexAfterRemoval', () => {
  it('prefere a camada de baixo da excluída', () => {
    expect(activeIndexAfterRemoval(2, 2)).toBe(1); // [a, b, c] sem c → b
    expect(activeIndexAfterRemoval(2, 1)).toBe(0); // [a, b, c] sem b → a
  });

  it('ao excluir a mais de baixo, fica a que ocupou o lugar dela', () => {
    expect(activeIndexAfterRemoval(2, 0)).toBe(0); // [a, b, c] sem a → b
  });
});

describe('clampOpacity', () => {
  it('prende entre 0 e 1', () => {
    expect(clampOpacity(-0.5)).toBe(0);
    expect(clampOpacity(0.4)).toBe(0.4);
    expect(clampOpacity(7)).toBe(1);
  });

  it('trata valor inválido como opaco', () => {
    expect(clampOpacity(Number.NaN)).toBe(1);
  });
});
