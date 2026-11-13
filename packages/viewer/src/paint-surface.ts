import { CanvasTexture, SRGBColorSpace, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Intersection, Mesh } from 'three';
import {
  History,
  includeEllipse,
  toPixelRect,
  uvScaleFromTriangle,
  uvToPixel,
} from '@tattdraw/paint-engine';
import type { Bounds } from '@tattdraw/paint-engine';

/** Um recorte da textura: os pixels de um retângulo, como estavam num certo momento. */
interface Patch {
  x: number;
  y: number;
  image: ImageData;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

/** Limites do histórico: até 50 ações ou 128 MB de recortes, o que vier primeiro. */
const MAX_UNDO_STEPS = 50;
const MAX_UNDO_BYTES = 128 * 1024 * 1024;

/**
 * Superfície de pintura: um <canvas> 2D usado como textura do modelo.
 *
 * O fluxo de um carimbo do pincel:
 * 1. O raio da câmera atinge o modelo (`Intersection`), que informa o UV e o triângulo atingidos.
 * 2. Medimos quanto o UV estica naquele triângulo (`uvScaleFromTriangle`), para o pincel ter o
 *    mesmo tamanho na pele em qualquer lugar.
 * 3. Desenhamos uma elipse no canvas, na posição UV convertida em pixels.
 * 4. Uma vez por quadro, avisamos o three.js para reenviar a textura à GPU (`flush`).
 *
 * Como funciona o desfazer (veja também docs/adr/0005):
 * - Existe um segundo canvas, o `backup`, que guarda a pintura como estava ANTES do traço atual.
 * - Durante o traço, acompanhamos o retângulo que os carimbos tocaram (`strokeBounds`).
 * - Ao soltar a caneta (`endStroke`), copiamos esse retângulo do backup para o histórico (é o
 *   "antes") e atualizamos o backup com o resultado do traço.
 * - Desfazer devolve o recorte guardado aos dois canvas e guarda o recorte atual para o refazer.
 *
 * Só lemos pixels do backup, nunca do canvas principal: ler de volta um canvas que o navegador
 * mantém na placa de vídeo é lento e pode fazê-lo desistir da aceleração.
 *
 * Limitação conhecida: um carimbo bem em cima da costura do UV (onde u volta de 1 para 0)
 * aparece cortado. Resolver isso faz parte do trabalho com o modelo de corpo definitivo.
 */
export class PaintSurface {
  readonly texture: CanvasTexture;
  readonly size: number;

  /** Chamado sempre que muda o que dá para desfazer ou refazer (para atualizar os botões). */
  onHistoryChange: ((state: HistoryState) => void) | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backup: HTMLCanvasElement;
  private readonly backupCtx: CanvasRenderingContext2D;
  private readonly baseColor: string;
  private readonly history = new History<Patch>({
    maxEntries: MAX_UNDO_STEPS,
    maxCost: MAX_UNDO_BYTES,
    costOf: (patch) => patch.image.data.byteLength,
  });

  private dirty = false;
  private strokeActive = false;
  private strokeBounds: Bounds | null = null;
  /** Verdadeiro enquanto a textura está só com a cor da pele (evita "limpar" repetido). */
  private blank = true;

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

    this.canvas = createCanvas(size);
    const ctx = this.canvas.getContext('2d');
    // willReadFrequently avisa o navegador para manter o backup na memória comum (CPU),
    // onde ler pixels é rápido.
    this.backup = createCanvas(size);
    const backupCtx = this.backup.getContext('2d', { willReadFrequently: true });
    if (!ctx || !backupCtx) throw new Error('Este navegador não oferece canvas 2D');
    this.ctx = ctx;
    this.backupCtx = backupCtx;

    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;

    this.fillWithBaseColor();
    this.backupCtx.drawImage(this.canvas, 0, 0);
  }

  get historyState(): HistoryState {
    return { canUndo: this.history.canUndo, canRedo: this.history.canRedo };
  }

  /** Marca o começo de uma ação que poderá ser desfeita de uma vez só (um traço inteiro). */
  beginStroke(): void {
    this.strokeActive = true;
    this.strokeBounds = null;
  }

  /** Pinta um carimbo de raio `radius` (em unidades do mundo, ou seja, metros de pele). */
  stamp(hit: Intersection, radius: number, color: string): void {
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

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.strokeBounds = includeEllipse(this.strokeBounds, center.x, center.y, rx, ry);
    this.blank = false;
    this.dirty = true;
  }

  /** Fecha a ação aberta por `beginStroke` e a registra no histórico. */
  endStroke(): void {
    if (!this.strokeActive) return;
    this.strokeActive = false;

    const rect = this.strokeBounds && toPixelRect(this.strokeBounds, this.size, this.size);
    this.strokeBounds = null;
    if (!rect) return; // o traço não chegou a pintar nada

    // O backup ainda tem a pintura de antes do traço: esse recorte é o que o desfazer devolve.
    const before = this.backupCtx.getImageData(rect.x, rect.y, rect.width, rect.height);
    this.history.push({ x: rect.x, y: rect.y, image: before });

    // Agora o backup passa a refletir a pintura com o traço.
    this.backupCtx.drawImage(
      this.canvas,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
    this.notifyHistory();
  }

  /** Apaga toda a pintura, voltando à cor da pele. Também pode ser desfeito. */
  clear(): void {
    if (this.strokeActive || this.blank) return;
    this.beginStroke();
    this.fillWithBaseColor();
    this.strokeBounds = { minX: 0, minY: 0, maxX: this.size, maxY: this.size };
    this.endStroke();
  }

  undo(): boolean {
    if (this.strokeActive) return false;
    const done = this.history.undo((patch) => this.swapPatch(patch));
    if (done) this.notifyHistory();
    return done;
  }

  redo(): boolean {
    if (this.strokeActive) return false;
    const done = this.history.redo((patch) => this.swapPatch(patch));
    if (done) this.notifyHistory();
    return done;
  }

  /**
   * Envia a textura para a GPU se algo mudou. Chamar uma vez por quadro: enviar a cada carimbo
   * repetiria o envio (até 64 MB numa textura de 4096 px) dezenas de vezes por quadro.
   */
  flush(): void {
    if (!this.dirty) return;
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  dispose(): void {
    this.onHistoryChange = null;
    this.history.clear();
    this.texture.dispose();
  }

  /**
   * Coloca um recorte na pintura e devolve o recorte que estava no lugar.
   * Serve para os dois sentidos: desfazer troca "depois" por "antes"; refazer, o contrário.
   */
  private swapPatch(patch: Patch): Patch {
    const { x, y, image } = patch;
    const current = this.backupCtx.getImageData(x, y, image.width, image.height);
    this.ctx.putImageData(image, x, y);
    this.backupCtx.putImageData(image, x, y);
    this.blank = false;
    this.dirty = true;
    return { x, y, image: current };
  }

  private fillWithBaseColor(): void {
    this.ctx.fillStyle = this.baseColor;
    this.ctx.fillRect(0, 0, this.size, this.size);
    this.blank = true;
    this.dirty = true;
  }

  private notifyHistory(): void {
    this.onHistoryChange?.(this.historyState);
  }
}

function createCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}
