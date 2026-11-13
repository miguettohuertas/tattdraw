import type { Brush, BrushTool } from '@tattdraw/viewer';

/**
 * Configurações do pincel como o usuário as vê: tamanho em milímetros (diâmetro) e um tamanho
 * separado para cada ferramenta, para a borracha poder ser grossa sem mudar o pincel.
 *
 * Este arquivo só tem lógica, sem tocar na tela, para poder ser testado.
 */
export interface BrushSettings {
  tool: BrushTool;
  color: string;
  /** Diâmetro em milímetros, um por ferramenta. */
  sizeMm: Record<BrushTool, number>;
}

export const MIN_SIZE_MM = 0.5;
export const MAX_SIZE_MM = 30;
export const SIZE_STEP_MM = 0.5;

/** Cores prontas na barra. A primeira é a cor inicial. */
export const PALETTE = [
  { name: 'Preto', color: '#1a1a1a' },
  { name: 'Cinza', color: '#6b6b6b' },
  { name: 'Vermelho', color: '#b3261e' },
  { name: 'Azul', color: '#1f4e9c' },
  { name: 'Verde', color: '#1e6b3a' },
] as const;

export const DEFAULT_SETTINGS: BrushSettings = {
  tool: 'pen',
  color: PALETTE[0].color,
  sizeMm: { pen: 5, eraser: 12 },
};

/** Converte as configurações no formato que o viewer entende (raio em metros). */
export function toViewerBrush(settings: BrushSettings): Brush {
  return {
    tool: settings.tool,
    color: settings.color,
    radius: settings.sizeMm[settings.tool] / 2 / 1000,
  };
}

/** Prende o tamanho entre o mínimo e o máximo e alinha ao passo do controle. */
export function clampSize(mm: number): number {
  const stepped = Math.round(mm / SIZE_STEP_MM) * SIZE_STEP_MM;
  return Math.min(MAX_SIZE_MM, Math.max(MIN_SIZE_MM, stepped));
}

/**
 * Próximo tamanho ao apertar [ ou ]. O passo cresce com o tamanho (0,5 mm até 5 mm, 1 mm até
 * 10 mm, 2 mm acima), para não precisar apertar a tecla dezenas de vezes.
 */
export function stepSize(mm: number, direction: 1 | -1): number {
  const reference = direction === 1 ? mm : mm - 0.01;
  const step = reference < 5 ? 0.5 : reference < 10 ? 1 : 2;
  return clampSize(mm + direction * step);
}

/** Texto do tamanho, no formato brasileiro: "5 mm", "2,5 mm". */
export function formatSize(mm: number): string {
  return `${mm.toLocaleString('pt-BR')} mm`;
}
