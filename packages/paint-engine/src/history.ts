/**
 * Histórico de desfazer/refazer.
 *
 * Funciona com duas pilhas:
 * - `undoStack`: o que dá para desfazer (a ação mais recente fica no topo).
 * - `redoStack`: o que foi desfeito e ainda dá para refazer.
 *
 * Cada item guarda só o necessário para **voltar** ao estado anterior. Ao desfazer, quem aplica
 * o item devolve o item inverso (o que é preciso para refazer), que vai para a outra pilha.
 * Assim cada ação ocupa memória uma vez só, e não duas (antes + depois).
 *
 * A classe não sabe o que é um item (`T`): no TattDraw é um recorte da textura, mas a lógica das
 * pilhas e do limite de memória é a mesma para qualquer coisa. Por isso mora aqui, sem UI,
 * e pode ser testada sozinha.
 */

export interface HistoryOptions<T> {
  /** Número máximo de ações que dá para desfazer. */
  maxEntries: number;
  /** Limite de "custo" somado (no TattDraw, bytes de imagem). */
  maxCost: number;
  /** Quanto custa guardar um item. */
  costOf: (entry: T) => number;
}

export class History<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private readonly options: HistoryOptions<T>;

  constructor(options: HistoryOptions<T>) {
    this.options = options;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Custo somado de tudo que está guardado (desfazer + refazer). */
  get totalCost(): number {
    const { costOf } = this.options;
    return [...this.undoStack, ...this.redoStack].reduce((sum, e) => sum + costOf(e), 0);
  }

  /**
   * Registra uma ação nova. Como em qualquer editor, fazer algo novo depois de desfazer
   * descarta o que poderia ser refeito.
   */
  push(entry: T): void {
    this.redoStack = [];
    this.undoStack.push(entry);
    this.trim();
  }

  /**
   * Desfaz a ação mais recente. `apply` recebe o item, restaura o estado e devolve o item
   * inverso (para refazer). Devolve `false` se não havia nada para desfazer.
   */
  undo(apply: (entry: T) => T): boolean {
    const entry = this.undoStack.pop();
    if (entry === undefined) return false;
    this.redoStack.push(apply(entry));
    return true;
  }

  /** Refaz a última ação desfeita. Funciona como `undo`, no sentido contrário. */
  redo(apply: (entry: T) => T): boolean {
    const entry = this.redoStack.pop();
    if (entry === undefined) return false;
    this.undoStack.push(apply(entry));
    this.trim();
    return true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Respeita os limites descartando as ações MAIS ANTIGAS primeiro.
   * A ação mais recente nunca é descartada, mesmo que sozinha passe do limite de custo:
   * é melhor gastar memória do que não conseguir desfazer o que acabou de ser feito.
   */
  private trim(): void {
    const { maxEntries, maxCost } = this.options;
    while (
      this.undoStack.length > 1 &&
      (this.undoStack.length > maxEntries || this.totalCost > maxCost)
    ) {
      this.undoStack.shift();
    }
  }
}
