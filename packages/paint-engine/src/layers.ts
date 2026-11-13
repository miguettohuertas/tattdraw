/**
 * Camadas: as regras, sem imagens.
 *
 * Uma camada é uma folha transparente por cima da pele. O desenho final é a pele mais as camadas
 * visíveis, empilhadas de baixo para cima. Aqui ficam só as decisões (nome da próxima camada,
 * qual fica ativa ao excluir, para onde uma camada se move); os pixels ficam no viewer.
 *
 * Convenção de ordem em todo o projeto: nas listas, o índice 0 é a camada DE BAIXO.
 */

export interface LayerInfo {
  /** Identificador interno; nunca muda nem se repete. */
  id: string;
  /** Nome mostrado ao usuário. */
  name: string;
  visible: boolean;
  /** De 0 (invisível) a 1 (totalmente opaca). */
  opacity: number;
}

/**
 * Nome para uma camada nova: "Camada N", com N uma unidade acima do maior número já usado.
 * Nomes fora do padrão (se um dia der para renomear) são ignorados na conta.
 */
export function nextLayerName(layers: readonly Pick<LayerInfo, 'name'>[]): string {
  let highest = 0;
  for (const { name } of layers) {
    const match = /^Camada (\d+)$/.exec(name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Camada ${highest + 1}`;
}

/**
 * Índice de destino ao mover uma camada `delta` posições (+1 sobe, -1 desce), sem sair da pilha.
 */
export function moveTarget(length: number, index: number, delta: number): number {
  return Math.min(length - 1, Math.max(0, index + delta));
}

/** Devolve uma cópia da lista com o item de `from` movido para `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}

/**
 * Qual camada fica ativa depois de excluir a do índice `removedIndex`.
 * `remaining` é a lista já sem a camada excluída. Preferimos a de baixo; se a excluída era a
 * mais de baixo, a que ficou no lugar dela. Devolve o índice em `remaining`.
 */
export function activeIndexAfterRemoval(remainingLength: number, removedIndex: number): number {
  return Math.min(remainingLength - 1, Math.max(0, removedIndex - 1));
}

/** Prende a opacidade entre 0 e 1. Valores inválidos viram 1 (opaca). */
export function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
}
