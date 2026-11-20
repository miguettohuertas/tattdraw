import {
  CanvasTexture,
  Color,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  NoBlending,
  NoColorSpace,
  OrthographicCamera,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import type { Camera, Intersection, WebGLRenderer } from 'three';
import { surfaceFrame } from '@tattdraw/paint-engine';

export interface DecalSettings {
  /**
   * Tamanho do lado maior da imagem na pele, em milímetros. O outro lado acompanha a proporção.
   * Medir pelo lado maior evita que uma imagem comprida fique gigante sem querer.
   */
  sizeMm: number;
  /** Rotação sobre a pele, em graus (positivo = anti-horário visto de fora). */
  rotationDeg: number;
}

/** Abaixo deste valor (cosseno do ângulo), a pele está de lado demais para receber a imagem. */
const MIN_FACING = 0.2;

/**
 * As contas da projeção, em GLSL (a linguagem dos programas que rodam na placa de vídeo).
 *
 * `decalProjector` leva um ponto do mundo para o "espaço do projetor": x e y de -0,5 a 0,5
 * cobrem a imagem, e z mede a distância ao longo da normal. A mesma conta é usada na prévia e na
 * hora de aplicar, para o resultado gravado ser idêntico ao que se viu.
 */
const DECAL_VARYINGS = /* glsl */ `
varying vec3 vDecalCoord;
varying float vDecalFacing;
`;
const DECAL_VERTEX_UNIFORMS = /* glsl */ `
uniform mat4 decalProjector;
uniform vec3 decalNormal;
${DECAL_VARYINGS}
`;
const DECAL_DISCARD = /* glsl */ `
vec2 decalUv = vDecalCoord.xy + 0.5;
if ( decalUv.x < 0.0 || decalUv.x > 1.0 || decalUv.y < 0.0 || decalUv.y > 1.0 ||
     abs( vDecalCoord.z ) > 0.5 || vDecalFacing < ${MIN_FACING.toFixed(2)} ) discard;
`;

/**
 * Carimbo: uma imagem projetada sobre a pele, que pode ser movida, girada e redimensionada
 * antes de ser aplicada.
 *
 * Como a imagem vai parar na textura (veja docs/adr/0007):
 * - **Prévia:** uma cópia do modelo, desenhada por cima da pele, com o mesmo material da pele
 *   (mesma luz, mesmo brilho). Em vez de usar o UV para achar a cor, ela usa a projeção.
 * - **Aplicar:** desenhamos o modelo "aberto" no espaço UV, numa imagem do tamanho da textura:
 *   cada triângulo vai para onde ele fica na textura, e cada pixel pergunta à projeção que cor
 *   deve ter. Isso respeita a curvatura e as costuras do UV automaticamente.
 */
export class DecalTool {
  /** Verdadeiro enquanto há uma imagem sendo posicionada. */
  active = false;

  private readonly renderer: WebGLRenderer;
  private readonly target: Mesh;
  private readonly camera: Camera;

  private readonly projector = new Matrix4();
  private readonly projectorNormal = new Vector3();
  private readonly center = new Vector3();
  private readonly normal = new Vector3(0, 0, 1);
  /** "Para cima" da imagem sobre a pele, antes da rotação. Acompanha a imagem quando ela anda. */
  private readonly up = new Vector3(0, 1, 0);

  private readonly preview: Mesh;
  private readonly previewMaterial: MeshStandardMaterial;
  private previewTexture: CanvasTexture | null = null;
  private image: HTMLCanvasElement | null = null;
  private settings: DecalSettings = { sizeMm: 60, rotationDeg: 0 };

  private readonly raycaster = new Raycaster();

  constructor(renderer: WebGLRenderer, target: Mesh, camera: Camera, roughness: number) {
    this.renderer = renderer;
    this.target = target;
    this.camera = camera;

    this.previewMaterial = new MeshStandardMaterial({
      roughness,
      transparent: true,
      depthWrite: false,
      // Empurra a prévia um pouquinho para a frente, para ela não "brigar" com a pele embaixo.
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    });
    this.previewMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.decalProjector = { value: this.projector };
      shader.uniforms.decalNormal = { value: this.projectorNormal };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${DECAL_VERTEX_UNIFORMS}`)
        .replace(
          '#include <project_vertex>',
          /* glsl */ `#include <project_vertex>
          vec4 decalWorld = modelMatrix * vec4( transformed, 1.0 );
          vDecalCoord = ( decalProjector * decalWorld ).xyz;
          vDecalFacing = dot( normalize( mat3( modelMatrix ) * objectNormal ), decalNormal );`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${DECAL_VARYINGS}`)
        .replace(
          '#include <map_fragment>',
          /* glsl */ `${DECAL_DISCARD}
          diffuseColor *= texture2D( map, decalUv );`,
        );
    };

    // A prévia usa a mesma geometria e fica "dentro" do modelo, então acompanha o modelo.
    this.preview = new Mesh(target.geometry, this.previewMaterial);
    this.preview.visible = false;
    this.preview.renderOrder = 1;
    target.add(this.preview);
  }

  /**
   * Começa a posicionar uma imagem, no ponto do modelo que está no centro da tela.
   * O "para cima" da imagem começa igual ao "para cima" da tela.
   */
  start(image: HTMLCanvasElement, settings: DecalSettings): void {
    this.active = true;
    this.settings = { ...settings };
    this.setImage(image);

    const hit = this.hitAtNdc(0, 0) ?? this.hitTowardTarget();
    const screenUp = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this.up.copy(screenUp);
    if (hit) {
      this.placeAt(hit);
    } else {
      this.update();
    }
    this.preview.visible = true;
  }

  /** Troca a imagem (por exemplo, com e sem o fundo branco) mantendo posição e tamanho. */
  setImage(image: HTMLCanvasElement): void {
    this.image = image;
    this.previewTexture?.dispose();
    this.previewTexture = new CanvasTexture(image);
    this.previewTexture.colorSpace = SRGBColorSpace;
    this.previewMaterial.map = this.previewTexture;
    this.previewMaterial.needsUpdate = true;
    this.update();
  }

  setSettings(changes: Partial<DecalSettings>): void {
    Object.assign(this.settings, changes);
    this.update();
  }

  /** Move o centro da imagem para um ponto do modelo atingido por um raio. */
  placeAt(hit: Intersection): void {
    this.center.copy(hit.point);
    const objectNormal = hit.normal ?? hit.face?.normal;
    if (objectNormal) {
      this.normal.copy(objectNormal).transformDirection(this.target.matrixWorld);
    }
    // O "para cima" anterior serve de dica: assim a imagem não gira sozinha ao ser arrastada.
    const screenRight = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const frame = surfaceFrame(this.normal, this.up, 0, screenRight);
    this.up.set(frame.up.x, frame.up.y, frame.up.z);
    this.update();
  }

  /** Lança um raio a partir de um ponto da tela (coordenadas de -1 a 1). */
  hitAtNdc(x: number, y: number): Intersection | undefined {
    this.raycaster.setFromCamera(new Vector2(x, y), this.camera);
    return this.raycaster.intersectObject(this.target, false)[0];
  }

  /**
   * Grava a imagem projetada numa imagem do tamanho da textura (`size` × `size`), transparente
   * fora do carimbo, pronta para virar uma camada.
   */
  bake(size: number): HTMLCanvasElement {
    if (!this.image) throw new Error('Nenhuma imagem para aplicar');

    // Para gravar, lemos os bytes da imagem como estão (sem conversão de cor), e escrevemos
    // os bytes como saíram: a camada fica com exatamente as cores do arquivo.
    const texture = new CanvasTexture(this.image);
    texture.colorSpace = NoColorSpace;
    const material = new ShaderMaterial({
      uniforms: {
        map: { value: texture },
        decalProjector: { value: this.projector },
        decalNormal: { value: this.projectorNormal },
      },
      vertexShader: /* glsl */ `
        ${DECAL_VERTEX_UNIFORMS}
        void main() {
          vec4 world = modelMatrix * vec4( position, 1.0 );
          vDecalCoord = ( decalProjector * world ).xyz;
          vDecalFacing = dot( normalize( mat3( modelMatrix ) * normal ), decalNormal );
          // O truque: a posição na tela é a posição na textura (UV de 0..1 vira -1..1).
          gl_Position = vec4( uv * 2.0 - 1.0, 0.0, 1.0 );
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        ${DECAL_VARYINGS}
        void main() {
          ${DECAL_DISCARD}
          gl_FragColor = texture2D( map, decalUv );
        }`,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
      // Aberto no espaço UV, um triângulo pode ficar "de costas": desenhamos os dois lados.
      side: DoubleSide,
    });

    const mesh = new Mesh(this.target.geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(this.target.matrixWorld);
    mesh.frustumCulled = false;
    const scene = new Scene();
    scene.add(mesh);

    const renderTarget = new WebGLRenderTarget(size, size);
    const previousTarget = this.renderer.getRenderTarget();
    const previousClear = this.renderer.getClearColor(new Color());
    const previousAlpha = this.renderer.getClearAlpha();

    this.renderer.setRenderTarget(renderTarget);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(scene, new OrthographicCamera());

    const pixels = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(renderTarget, 0, 0, size, size, pixels);

    this.renderer.setRenderTarget(previousTarget);
    this.renderer.setClearColor(previousClear, previousAlpha);
    renderTarget.dispose();
    material.dispose();
    texture.dispose();

    // A placa de vídeo entrega as linhas de baixo para cima; o canvas espera de cima para baixo.
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador não oferece canvas 2D');
    const imageData = ctx.createImageData(size, size);
    const rowBytes = size * 4;
    for (let row = 0; row < size; row++) {
      const from = row * rowBytes;
      imageData.data.set(pixels.subarray(from, from + rowBytes), (size - 1 - row) * rowBytes);
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /** Sai do modo de posicionamento (depois de aplicar ou cancelar). */
  stop(): void {
    this.active = false;
    this.preview.visible = false;
    this.previewMaterial.map = null;
    this.previewTexture?.dispose();
    this.previewTexture = null;
    this.image = null;
  }

  dispose(): void {
    this.stop();
    this.target.remove(this.preview);
    this.previewMaterial.dispose();
  }

  /** Recalcula a matriz do projetor a partir da posição, normal, tamanho e rotação. */
  private update(): void {
    const image = this.image;
    const longSide = this.settings.sizeMm / 1000;
    const imageWidth = image?.width ?? 1;
    const imageHeight = image?.height ?? 1;
    const width = imageWidth >= imageHeight ? longSide : (longSide * imageWidth) / imageHeight;
    const height = imageHeight >= imageWidth ? longSide : (longSide * imageHeight) / imageWidth;
    // Profundidade: até onde, para dentro e para fora da pele, a projeção alcança.
    const depth = Math.max(width, height, 0.02);

    const angle = (this.settings.rotationDeg * Math.PI) / 180;
    const frame = surfaceFrame(this.normal, this.up, angle);
    const right = new Vector3(frame.right.x, frame.right.y, frame.right.z).multiplyScalar(width);
    const up = new Vector3(frame.up.x, frame.up.y, frame.up.z).multiplyScalar(height);
    const normal = new Vector3(frame.normal.x, frame.normal.y, frame.normal.z);

    // A matriz "do projetor para o mundo" tem os eixos já no tamanho da imagem; a inversa leva
    // do mundo para o projetor, onde a imagem ocupa de -0,5 a 0,5.
    const projectorToWorld = new Matrix4()
      .makeBasis(right, up, normal.clone().multiplyScalar(depth))
      .setPosition(this.center);
    this.projector.copy(projectorToWorld).invert();
    this.projectorNormal.copy(normal);
  }

  /** Reserva: raio da câmera na direção do centro do modelo. */
  private hitTowardTarget(): Intersection | undefined {
    const origin = this.camera.getWorldPosition(new Vector3());
    const center = this.target.getWorldPosition(new Vector3());
    this.raycaster.set(origin, center.sub(origin).normalize());
    return this.raycaster.intersectObject(this.target, false)[0];
  }
}
