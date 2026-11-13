import { describe, expect, it } from 'vitest';
import { History } from './history';

/**
 * Nos testes, o "documento" é só um número e cada item do histórico guarda o valor anterior.
 * `set` imita um traço: guarda o valor antigo no histórico e aplica o novo.
 */
function createDoc(maxEntries = 10, maxCost = 1000) {
  const history = new History<number>({ maxEntries, maxCost, costOf: () => 1 });
  const doc = { value: 0 };
  const swap = (previous: number): number => {
    const current = doc.value;
    doc.value = previous;
    return current;
  };
  return {
    doc,
    history,
    set(value: number) {
      history.push(doc.value);
      doc.value = value;
    },
    undo: () => history.undo(swap),
    redo: () => history.redo(swap),
  };
}

describe('History', () => {
  it('começa sem nada para desfazer ou refazer', () => {
    const { history, undo, redo } = createDoc();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(undo()).toBe(false);
    expect(redo()).toBe(false);
  });

  it('desfaz as ações da mais recente para a mais antiga', () => {
    const d = createDoc();
    d.set(1);
    d.set(2);
    d.undo();
    expect(d.doc.value).toBe(1);
    d.undo();
    expect(d.doc.value).toBe(0);
    expect(d.history.canUndo).toBe(false);
  });

  it('refaz o que foi desfeito, na ordem inversa', () => {
    const d = createDoc();
    d.set(1);
    d.set(2);
    d.undo();
    d.undo();
    d.redo();
    expect(d.doc.value).toBe(1);
    d.redo();
    expect(d.doc.value).toBe(2);
    expect(d.history.canRedo).toBe(false);
  });

  it('uma ação nova descarta o que poderia ser refeito', () => {
    const d = createDoc();
    d.set(1);
    d.undo();
    d.set(5);
    expect(d.history.canRedo).toBe(false);
    d.undo();
    expect(d.doc.value).toBe(0);
  });

  it('esquece as ações mais antigas ao passar do número máximo', () => {
    const d = createDoc(2);
    d.set(1);
    d.set(2);
    d.set(3);
    d.undo();
    d.undo();
    expect(d.doc.value).toBe(1); // a volta para 0 foi esquecida
    expect(d.history.canUndo).toBe(false);
  });

  it('esquece as ações mais antigas ao passar do limite de custo', () => {
    const history = new History<{ bytes: number }>({
      maxEntries: 100,
      maxCost: 10,
      costOf: (e) => e.bytes,
    });
    history.push({ bytes: 6 });
    history.push({ bytes: 6 });
    expect(history.totalCost).toBe(6);
  });

  it('mantém a ação mais recente mesmo que sozinha passe do limite de custo', () => {
    const history = new History<{ bytes: number }>({
      maxEntries: 100,
      maxCost: 10,
      costOf: (e) => e.bytes,
    });
    history.push({ bytes: 50 });
    expect(history.canUndo).toBe(true);
  });

  it('clear esvazia as duas pilhas', () => {
    const d = createDoc();
    d.set(1);
    d.set(2);
    d.undo();
    d.history.clear();
    expect(d.history.canUndo).toBe(false);
    expect(d.history.canRedo).toBe(false);
  });
});
