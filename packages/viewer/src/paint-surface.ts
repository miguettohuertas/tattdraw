import { CanvasTexture, SRGBColorSpace, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Intersection, Mesh } from 'three';
import {
  activeIndexAfterRemoval,
  clampOpacity,
  History,
  includeEllipse,
  moveItem,
  moveTarget,
  nextLayerName,
  toPixelRect,
  uvScaleFromTriangle,
  uvToPixel,
} from '@tattdraw/paint-engine';
import type { Bounds, LayerInfo, PixelRect } from '@tattdraw/paint-engine';

export type BrushTool = 'pen' | 'eraser';

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export interface LayersState {
  /** Camadas de baixo para cima (o índice 0 é a mais de baixo). */
  layers: LayerInfo[];
  activeId: string;
  /** Falso quando o limite de camadas foi atingido. */
  canAdd: boolean;
}

/** Uma camada: as informações (nome, visível, opacidade) mais o canvas com os pixels. */
interface Layer {
  info: LayerInfo;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Verdadeiro enquanto a camada está toda transparente (evita "limpar" repetido). */
  blank: boolean;
}

/**
 * Um item do histórico. Cada item diz como VOLTAR um passo; ao ser aplicado, devolve o item
 * inverso (veja `History` no paint-engine).
 */
type Entry =
  /** Devolver estes pixels a um retângulo de uma camada (traço, borracha ou limpar). */
  | { kind: 'patch'; layerId: string; x: number; y: number; pixels: HTMLCanvasElement }
  /** Recolocar uma camada excluída na posição `index`. */
  | { kind: 'restore-layer'; layer: Layer; index: number }
  /** Tirar uma camada da pilha (desfaz "nova camada"; refaz "excluir"). */
  | { kind: 'delete-layer'; layerId: string };

/** Limites do histórico: até 50 ações ou 128 MB, o que vier primeiro. */
const MAX_UNDO_STEPS = 50;
const MAX_UNDO_BYTES = 128 * 1024 * 1024;
const BYTES_PER_PIXEL = 4;

/** Cada camada ocupa size² × 4 bytes (16 MB em 2048 px, 64 MB em 4096 px). */
const MAX_LAYERS_SMALL_TEXTURE = 8;
const MAX_LAYERS_LARGE_TEXTURE = 4;

/**
 * Superfície de pintura: a pele mais uma pilha de camadas transparentes, combinadas num
 * <canvas> que serve de textura para o modelo.
 *
 * Os canvas envolvidos:
 * - `layer.canvas` (um por camada): transparente, recebe os carimbos do pincel.
 * - `composite`: cor da pele + camadas visíveis, de baixo para cima. É a textura do modelo.
 * - `backup`: cópia da camada em que se está pintando, como estava ANTES do traço atual.
 *
 * O fluxo de um carimbo do pincel:
 * 1. O raio da câmera atinge o modelo (`Intersection`), que informa o UV e o triângulo atingidos.
 * 2. Medimos quanto o UV estica naquele triângulo (`uvScaleFromTriangle`), para o pincel ter o
 *    mesmo tamanho na pele em qualquer lugar.
 * 3. Desenhamos uma elipse na camada ativa. O pincel pinta; a borracha torna transparente.
 * 4. Uma vez por quadro (`flush`), recombinamos só o retângulo que mudou e avisamos o three.js
 *    para reenviar a textura à GPU.
 *
 * O desfazer guarda recortes da camada (docs/adr/0005) e também as camadas criadas e excluídas
 * (docs/adr/0006).
 *
 * Limitação conhecida: um carimbo bem em cima da costura do UV (onde u volta de 1 para 0)
 * aparece cortado. Resolver isso faz parte do trabalho com o modelo de corpo definitivo.
 */
export class PaintSurface {
  readonly texture: CanvasTexture;
  readonly size: number;
  /** Cor da pele: o fundo, por baixo de todas as camadas. */
  readonly baseColor: string;
  readonly maxLayers: number;

  /** Chamado sempre que muda o que dá para desfazer ou refazer (para atualizar os botões). */
  onHistoryChange: ((state: HistoryState) => void) | null = null;
  /** Chamado sempre que a pilha de camadas muda (para redesenhar o painel). */
  onLayersChange: ((state: LayersState) => void) | null = null;
  /** Chamado quando alguém tenta pintar numa camada oculta. */
  onPaintBlocked: (() => void) | null = null;

  private readonly composite: HTMLCanvasElement;
  private readonly compositeCtx: CanvasRenderingContext2D;
  private readonly backup: HTMLCanvasElement;
  private readonly backupCtx: CanvasRenderingContext2D;
  /** De qual camada o `backup` é cópia neste momento. */
  private backupLayer: Layer | null = null;

  private layers: Layer[] = [];
  private active: Layer;
  private nextLayerNumber = 1;

  private readonly history = new History<Entry>({
    maxEntries: MAX_UNDO_STEPS,
    maxCost: MAX_UNDO_BYTES,
    costOf: (entry) => this.costOf(entry),
  });

  /** Camada que está recebendo o traço em andamento (`null` fora de um traço). */
  private strokeLayer: Layer | null = null;
  private strokeActive = false;
  private strokeBounds: Bounds | null = null;
  /** Região do `composite` que precisa ser recombinada no próximo quadro. */
  private pending: Bounds | null = null;

  // Vetores reaproveitados para não criar lixo de memória a cada carimbo.
  private readonly p0 = new Vector3();
  private readonly p1 = new Vector3();
  private readonly p2 = new Vector3();
  private readonly uv0 = new Vector2();
  private readonly uv1 = new Vector2();
  private readonly uv2 = new Vector2();

  constructor(size: number, baseColor: string) {
    this.size = size;
    this.baseColor = baseColor;
    this.maxLayers = size > 2048 ? MAX_LAYERS_LARGE_TEXTURE : MAX_LAYERS_SMALL_TEXTURE;

    [this.composite, this.compositeCtx] = createCanvas(size, size);
    [this.backup, this.backupCtx] = createCanvas(size, size);

    this.texture = new CanvasTexture(this.composite);
    this.texture.colorSpace = SRGBColorSpace;

    this.active = this.createLayer();
    this.layers.push(this.active);
    this.invalidateAll();
  }

  get historyState(): HistoryState {
    return { canUndo: this.history.canUndo, canRedo: this.history.canRedo };
  }

  get layersState(): LayersState {
    return {
      layers: this.layers.map((layer) => ({ ...layer.info })),
      activeId: this.active.info.id,
      canAdd: this.layers.length < this.maxLayers,
    };
  }

  // ----------------------------------------------------------------------------------------
  // Pintura
  // ----------------------------------------------------------------------------------------

  /** Marca o começo de uma ação que poderá ser desfeita de uma vez só (um traço inteiro). */
  beginStroke(): void {
    this.strokeActive = true;
    this.strokeBounds = null;

    if (!this.active.info.visible) {
      // Pintar sem ver o resultado só confunde: avisamos e ignoramos o traço.
      this.strokeLayer = null;
      this.onPaintBlocked?.();
      return;
    }
    this.strokeLayer = this.active;
    this.syncBackup(this.active);
  }

  /** Pinta um carimbo de raio `radius` (em unidades do mundo, ou seja, metros de pele). */
  stamp(hit: Intersection, radius: number, tool: BrushTool, color: string): void {
    const layer = this.strokeLayer;
    if (!layer) return;
    // Apagar numa camada vazia não muda nada: não vale gastar um passo do histórico com isso.
    if (tool === 'eraser' && layer.blank) return;

    const mesh = hit.object as Mesh;
    const geometry = mesh.geometry as BufferGeometry;
    const position = geometry.getAttribute('position');
    const uvAttr = geometry.getAttribute('uv');
    if (!hit.face || !hit.uv || !position || !uvAttr) return;

    // Lemos com getX/getY/getZ porque funcionam tanto em atributos comuns quanto nos
    // "intercalados" (interleaved), que alguns arquivos glTF usam.
    const { a, b, c } = hit.face;
    const m = mesh.matrixWorld;
    this.p0.set(position.getX(a), position.getY(a), position.getZ(a)).applyMatrix4(m);
    this.p1.set(position.getX(b), position.getY(b), position.getZ(b)).applyMatrix4(m);
    this.p2.set(position.getX(c), position.getY(c), position.getZ(c)).applyMatrix4(m);
    this.uv0.set(uvAttr.getX(a), uvAttr.getY(a));
    this.uv1.set(uvAttr.getX(b), uvAttr.getY(b));
    this.uv2.set(uvAttr.getX(c), uvAttr.getY(c));

    const scale = uvScaleFromTriangle(this.p0, this.p1, this.p2, this.uv0, this.uv1, this.uv2);
    if (!scale) return;

    const center = uvToPixel({ u: hit.uv.x, v: hit.uv.y }, this.size, this.size);
    const rx = (radius / scale.u) * this.size;
    const ry = (radius / scale.v) * this.size;

    const { ctx } = layer;
    // 'destination-out' faz o desenho APAGAR o que está embaixo dele (deixa transparente),
    // em vez de pintar por cima. É assim que a borracha revela as camadas de baixo e a pele.
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    if (tool === 'pen') layer.blank = false;
    this.strokeBounds = includeEllipse(this.strokeBounds, center.x, center.y, rx, ry);
    this.pending = includeEllipse(this.pending, center.x, center.y, rx, ry);
  }

  /** Fecha a ação aberta por `beginStroke` e a registra no histórico. */
  endStroke(): void {
    if (!this.strokeActive) return;
    this.strokeActive = false;

    const layer = this.strokeLayer;
    const rect = this.strokeBounds && toPixelRect(this.strokeBounds, this.size, this.size);
    this.strokeLayer = null;
    this.strokeBounds = null;
    if (!layer || !rect) return; // o traço não chegou a pintar nada

    this.commit(layer, rect);
  }

  /** Apaga tudo da camada ativa. Também pode ser desfeito. */
  clear(): void {
    const layer = this.active;
    if (this.strokeActive || layer.blank) return;

    this.syncBackup(layer);
    layer.ctx.clearRect(0, 0, this.size, this.size);
    layer.blank = true;
    this.commit(layer, { x: 0, y: 0, width: this.size, height: this.size });
  }

  // ----------------------------------------------------------------------------------------
  // Camadas
  // ----------------------------------------------------------------------------------------

  /** Cria uma camada vazia logo acima da ativa e passa a pintar nela. */
  addLayer(): boolean {
    if (this.strokeActive || this.layers.length >= this.maxLayers) return false;

    const layer = this.createLayer();
    this.layers.splice(this.layers.indexOf(this.active) + 1, 0, layer);
    this.active = layer;
    // Desfazer "nova camada" é tirar a camada da pilha.
    this.history.push({ kind: 'delete-layer', layerId: layer.info.id });
    this.notifyLayers();
    this.notifyHistory();
    return true;
  }

  /** Exclui uma camada (sempre sobra pelo menos uma). Pode ser desfeito. */
  removeLayer(id: string): boolean {
    if (this.strokeActive || this.layers.length <= 1 || !this.findLayer(id)) return false;

    this.history.push(this.detachLayer(id));
    this.notifyLayers();
    this.notifyHistory();
    return true;
  }

  selectLayer(id: string): void {
    const layer = this.findLayer(id);
    if (!layer || layer === this.active || this.strokeActive) return;
    this.active = layer;
    this.notifyLayers();
  }

  setLayerVisible(id: string, visible: boolean): void {
    const layer = this.findLayer(id);
    if (!layer || layer.info.visible === visible) return;
    layer.info.visible = visible;
    this.invalidateAll();
    this.notifyLayers();
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.findLayer(id);
    if (!layer) return;
    layer.info.opacity = clampOpacity(opacity);
    this.invalidateAll();
    this.notifyLayers();
  }

  /** Move uma camada na pilha: `delta` +1 sobe uma posição, -1 desce. */
  moveLayer(id: string, delta: number): void {
    const from = this.layers.findIndex((layer) => layer.info.id === id);
    if (from < 0 || this.strokeActive) return;
    const to = moveTarget(this.layers.length, from, delta);
    if (to === from) return;
    this.layers = moveItem(this.layers, from, to);
    this.invalidateAll();
    this.notifyLayers();
  }

  // ----------------------------------------------------------------------------------------
  // Histórico
  // ----------------------------------------------------------------------------------------

  undo(): boolean {
    if (this.strokeActive) return false;
    const done = this.history.undo((entry) => this.applyEntry(entry));
    if (done) this.notifyHistory();
    return done;
  }

  redo(): boolean {
    if (this.strokeActive) return false;
    const done = this.history.redo((entry) => this.applyEntry(entry));
    if (done) this.notifyHistory();
    return done;
  }

  // ----------------------------------------------------------------------------------------
  // Ciclo de vida
  // ----------------------------------------------------------------------------------------

  /**
   * Recombina a região que mudou e envia a textura para a GPU. Chamar uma vez por quadro:
   * enviar a cada carimbo repetiria o envio (até 64 MB numa textura de 4096 px) dezenas de
   * vezes por quadro.
   */
  flush(): void {
    if (!this.pending) return;
    const rect = toPixelRect(this.pending, this.size, this.size);
    this.pending = null;
    if (!rect) return;

    const ctx = this.compositeCtx;
    const { x, y, width, height } = rect;
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(x, y, width, height);
    for (const layer of this.layers) {
      if (!layer.info.visible || layer.info.opacity === 0) continue;
      ctx.globalAlpha = layer.info.opacity;
      ctx.drawImage(layer.canvas, x, y, width, height, x, y, width, height);
    }
    ctx.globalAlpha = 1;
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.onHistoryChange = null;
    this.onLayersChange = null;
    this.onPaintBlocked = null;
    this.history.clear();
    this.texture.dispose();
  }

  // ----------------------------------------------------------------------------------------
  // Partes internas
  // ----------------------------------------------------------------------------------------

  private createLayer(): Layer {
    const [canvas, ctx] = createCanvas(this.size, this.size);
    const number = this.nextLayerNumber++;
    return {
      info: {
        id: `layer-${number}`,
        name: nextLayerName(this.layers.map((layer) => layer.info)),
        visible: true,
        opacity: 1,
      },
      canvas,
      ctx,
      blank: true,
    };
  }

  private findLayer(id: string): Layer | undefined {
    return this.layers.find((layer) => layer.info.id === id);
  }

  /**
   * Registra no histórico o que mudou em `rect` e atualiza o backup.
   * O backup ainda tem a camada como era antes: esse recorte é o que o desfazer devolve.
   */
  private commit(layer: Layer, rect: PixelRect): void {
    const before = copyRegion(this.backup, rect);
    this.history.push({
      kind: 'patch',
      layerId: layer.info.id,
      x: rect.x,
      y: rect.y,
      pixels: before,
    });
    pasteRegion(this.backupCtx, layer.canvas, rect);
    this.invalidate(rect);
    this.notifyHistory();
  }

  /** Aplica um item do histórico e devolve o item inverso. Vale para desfazer e para refazer. */
  private applyEntry(entry: Entry): Entry {
    switch (entry.kind) {
      case 'patch': {
        const layer = this.findLayer(entry.layerId);
        if (!layer)
          throw new Error(`Histórico aponta para a camada ${entry.layerId}, que não existe`);
        const rect = {
          x: entry.x,
          y: entry.y,
          width: entry.pixels.width,
          height: entry.pixels.height,
        };
        this.syncBackup(layer);
        const current = copyRegion(this.backup, rect);
        pasteRegion(layer.ctx, entry.pixels, rect, 0, 0);
        pasteRegion(this.backupCtx, entry.pixels, rect, 0, 0);
        layer.blank = false;
        this.invalidate(rect);
        return { ...entry, pixels: current };
      }
      case 'restore-layer': {
        this.layers.splice(entry.index, 0, entry.layer);
        this.active = entry.layer;
        this.invalidateAll();
        this.notifyLayers();
        return { kind: 'delete-layer', layerId: entry.layer.info.id };
      }
      case 'delete-layer': {
        const inverse = this.detachLayer(entry.layerId);
        this.notifyLayers();
        return inverse;
      }
    }
  }

  /** Tira uma camada da pilha e devolve o item de histórico que a recoloca. */
  private detachLayer(id: string): Entry {
    const index = this.layers.findIndex((layer) => layer.info.id === id);
    const layer = this.layers[index];
    if (!layer) throw new Error(`Camada ${id} não existe`);

    this.layers.splice(index, 1);
    if (this.active === layer) {
      const next = this.layers[activeIndexAfterRemoval(this.layers.length, index)];
      if (!next) throw new Error('A pilha de camadas não pode ficar vazia');
      this.active = next;
    }
    if (this.backupLayer === layer) this.backupLayer = null;
    this.invalidateAll();
    return { kind: 'restore-layer', layer, index };
  }

  /**
   * Garante que o backup seja uma cópia fiel de `layer`.
   * Existe um backup só, compartilhado: manter um por camada dobraria a memória de todas.
   * A cópia completa só acontece ao trocar de camada; entre traços na mesma camada, o backup
   * já está em dia.
   */
  private syncBackup(layer: Layer): void {
    if (this.backupLayer === layer) return;
    pasteRegion(this.backupCtx, layer.canvas, { x: 0, y: 0, width: this.size, height: this.size });
    this.backupLayer = layer;
  }

  private costOf(entry: Entry): number {
    switch (entry.kind) {
      case 'patch':
        return entry.pixels.width * entry.pixels.height * BYTES_PER_PIXEL;
      case 'restore-layer':
        return this.size * this.size * BYTES_PER_PIXEL; // a camada excluída continua na memória
      case 'delete-layer':
        return 0;
    }
  }

  private invalidate(rect: PixelRect): void {
    this.pending = includeEllipse(
      this.pending,
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width / 2,
      rect.height / 2,
    );
  }

  private invalidateAll(): void {
    this.invalidate({ x: 0, y: 0, width: this.size, height: this.size });
  }

  private notifyHistory(): void {
    this.onHistoryChange?.(this.historyState);
  }

  private notifyLayers(): void {
    this.onLayersChange?.(this.layersState);
  }
}

function createCanvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não oferece canvas 2D');
  return [canvas, ctx];
}

/** Copia um retângulo de `source` para um canvas novo, do tamanho do retângulo. */
function copyRegion(source: HTMLCanvasElement, rect: PixelRect): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(rect.width, rect.height);
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return canvas;
}

/**
 * Substitui o retângulo `rect` de `target` pelos pixels de `source`.
 * `sourceX`/`sourceY` dizem onde o retângulo começa em `source` (por padrão, na mesma posição).
 *
 * Limpamos antes de desenhar porque as camadas são transparentes: desenhar por cima MISTURARIA
 * os pixels novos com os antigos, e o que queremos é trocar uns pelos outros, exatamente.
 * Fazemos isso com drawImage, e não com getImageData/putImageData, porque estes convertem os
 * pixels semitransparentes das bordas e perdem precisão a cada ida e volta.
 */
function pasteRegion(
  target: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  rect: PixelRect,
  sourceX = rect.x,
  sourceY = rect.y,
): void {
  const { x, y, width, height } = rect;
  target.clearRect(x, y, width, height);
  target.drawImage(source, sourceX, sourceY, width, height, x, y, width, height);
}
