import { CanvasTexture, SRGBColorSpace, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Intersection, Mesh } from 'three';
import { uvScaleFromTriangle, uvToPixel } from '@tattdraw/paint-engine';

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
 * Limitação conhecida: um carimbo bem em cima da costura do UV (onde u volta de 1 para 0)
 * aparece cortado. Resolver isso faz parte do trabalho com o modelo de corpo definitivo.
 */
export class PaintSurface {
  readonly texture: CanvasTexture;
  readonly size: number;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly baseColor: string;
  private dirty = false;

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
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador não oferece canvas 2D');
    this.ctx = ctx;

    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.clear();
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
    this.dirty = true;
  }

  /** Apaga toda a pintura, voltando à cor da pele. */
  clear(): void {
    this.ctx.fillStyle = this.baseColor;
    this.ctx.fillRect(0, 0, this.size, this.size);
    this.dirty = true;
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
    this.texture.dispose();
  }
}
