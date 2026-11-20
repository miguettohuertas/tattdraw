import {
  AmbientLight,
  Color,
  DirectionalLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BODY_PARTS, clampBodyMeasurements } from '@tattdraw/body';
import type { BodyPartId, LimbMeasurements } from '@tattdraw/body';
import { createBodyGeometry, disposeBodyGeometry } from './body-geometry';
import { attachDecalInput } from './decal-input';
import { DecalTool } from './decal-tool';
import type { DecalSettings } from './decal-tool';
import { attachPaintInput } from './paint-input';
import type { Brush } from './paint-input';
import { PaintSurface } from './paint-surface';
import type { HistoryState, LayersState } from './paint-surface';

export interface ViewerOptions {
  /** Lado da textura de pintura, em pixels. Padrão 2048. Use 4096 para testar o limite. */
  textureSize?: number;
  brush?: Partial<Brush>;
  /** Avisa quando muda o que dá para desfazer ou refazer (para habilitar os botões). */
  onHistoryChange?: (state: HistoryState) => void;
  /** Avisa quando a pilha de camadas muda (para redesenhar o painel). */
  onLayersChange?: (state: LayersState) => void;
  /** Avisa quando alguém tenta pintar numa camada oculta. */
  onPaintBlocked?: () => void;
  /** Parte do corpo mostrada ao abrir. Padrão: antebraço. */
  bodyPart?: BodyPartId;
}

export interface Viewer {
  /** Troca cor, tamanho ou ferramenta do pincel. Só os campos informados mudam. */
  setBrush(changes: Partial<Brush>): void;
  /** Apaga tudo da camada ativa (também pode ser desfeito). */
  clearPaint(): void;
  /** Estado atual das camadas, de baixo para cima. */
  getLayers(): LayersState;
  /** Cria uma camada vazia acima da ativa. Devolve `false` se o limite foi atingido. */
  addLayer(): boolean;
  /** Exclui uma camada (sempre sobra uma). Pode ser desfeito. */
  removeLayer(id: string): boolean;
  /** Escolhe em qual camada o pincel pinta. */
  selectLayer(id: string): void;
  setLayerVisible(id: string, visible: boolean): void;
  /** Opacidade de 0 (invisível) a 1 (opaca). */
  setLayerOpacity(id: string, opacity: number): void;
  /** Move a camada na pilha: +1 sobe, -1 desce. */
  moveLayer(id: string, delta: number): void;
  /**
   * Começa a posicionar uma imagem sobre a pele. Enquanto isso, a caneta move a imagem em vez
   * de pintar, e desfazer/refazer ficam suspensos.
   */
  startDecal(image: HTMLCanvasElement, settings: DecalSettings): void;
  /** Troca a imagem em posicionamento (por exemplo, com e sem fundo branco). */
  setDecalImage(image: HTMLCanvasElement): void;
  /** Muda tamanho ou rotação da imagem em posicionamento. */
  setDecalSettings(changes: Partial<DecalSettings>): void;
  /**
   * Grava a imagem numa camada nova chamada `layerName`. Devolve onde ela foi parar
   * (`'active-layer'` quando o limite de camadas foi atingido), ou `null` se não havia imagem.
   */
  applyDecal(layerName: string): 'new-layer' | 'active-layer' | null;
  /** Desiste da imagem em posicionamento, sem mudar nada. */
  cancelDecal(): void;
  isPlacingDecal(): boolean;
  /** Parte do corpo mostrada agora. */
  getBodyPart(): BodyPartId;
  /**
   * Troca a parte do corpo. Cada parte guarda o seu desenho (camadas e histórico) e as suas
   * medidas: voltar para uma parte traz tudo de volta como estava. A câmera volta ao início.
   */
  setBodyPart(id: BodyPartId): void;
  /** Medidas da parte atual, em centímetros. */
  getMeasurements(): LimbMeasurements;
  /**
   * Muda as medidas da parte atual. A pintura acompanha a pele: se o braço engrossa, o desenho
   * estica junto. Não entra no histórico.
   */
  setMeasurements(changes: Partial<LimbMeasurements>): void;
  /** Desfaz o último traço. Devolve `false` se não havia o que desfazer. */
  undo(): boolean;
  /** Refaz o último traço desfeito. Devolve `false` se não havia o que refazer. */
  redo(): boolean;
  /** Libera GPU, eventos e o loop de desenho. Chame ao sair da tela. */
  dispose(): void;
}

const SKIN_COLOR = '#d9a58a';
const SKIN_ROUGHNESS = 0.6;

/** Campo de visão vertical em telas largas, em graus. */
const BASE_FOV = 40;
/** Abaixo desta proporção (largura ÷ altura), abrimos o campo de visão para o modelo caber. */
const MIN_ASPECT = 1.2;
const DEFAULT_BRUSH: Brush = { tool: 'pen', radius: 0.0025, color: '#1a1a1a' };

/**
 * Cria a cena 3D dentro de um <canvas> e liga a pintura.
 *
 * As distâncias da cena estão em metros. O modelo é uma parte do corpo gerada a partir das
 * medidas do cliente (pacote `@tattdraw/body`, veja docs/adr/0008 e 0009).
 */
export function createViewer(canvas: HTMLCanvasElement, options: ViewerOptions = {}): Viewer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  scene.background = new Color(0x1d1d22);

  const camera = new PerspectiveCamera(BASE_FOV, 1, 0.01, 10);
  camera.position.set(0, 0.08, 0.5);

  scene.add(new AmbientLight(0xffffff, 0.6));
  const keyLight = new DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(1, 2, 1.5);
  scene.add(keyLight);

  /**
   * Um "documento" por parte do corpo: as medidas e a superfície de pintura (com as camadas e o
   * histórico). Criado na primeira vez que a parte é aberta e guardado enquanto o app estiver
   * aberto. Só a geometria é refeita ao trocar de parte: ela é rápida de gerar e ocupa memória
   * de placa de vídeo à toa se ficar guardada.
   */
  interface PartDocument {
    measurements: LimbMeasurements;
    surface: PaintSurface;
  }
  const textureSize = options.textureSize ?? 2048;
  const documents = new Map<BodyPartId, PartDocument>();
  const documentFor = (id: BodyPartId): PartDocument => {
    let doc = documents.get(id);
    if (!doc) {
      doc = {
        measurements: { ...BODY_PARTS[id].defaults },
        surface: new PaintSurface(textureSize, SKIN_COLOR),
      };
      documents.set(id, doc);
    }
    return doc;
  };

  let partId: BodyPartId = options.bodyPart ?? 'forearm';
  let current = documentFor(partId);

  /** Só a superfície da parte atual conversa com a tela (botões, painel de camadas, avisos). */
  const connect = (surface: PaintSurface): void => {
    surface.onHistoryChange = options.onHistoryChange ?? null;
    surface.onLayersChange = options.onLayersChange ?? null;
    surface.onPaintBlocked = options.onPaintBlocked ?? null;
  };
  const disconnect = (surface: PaintSurface): void => {
    surface.onHistoryChange = null;
    surface.onLayersChange = null;
    surface.onPaintBlocked = null;
  };
  connect(current.surface);

  // A pele é uma textura em que se pode pintar. Cor branca no material para não tingir a textura.
  const material = new MeshStandardMaterial({
    map: current.surface.texture,
    roughness: SKIN_ROUGHNESS,
  });
  const body = new Mesh(createBodyGeometry(partId, current.measurements), material);
  scene.add(body);
  body.updateMatrixWorld();

  // Refazer a malha custa alguns milissegundos. Enquanto o dedo arrasta um controle de medida,
  // chegam vários pedidos por quadro: guardamos só o último e refazemos uma vez por quadro.
  let rebuildPending = false;
  const rebuild = (): void => {
    rebuildPending = false;
    const old = body.geometry;
    body.geometry = createBodyGeometry(partId, current.measurements);
    decal.syncGeometry();
    disposeBodyGeometry(old);
  };

  // A pintura e o carimbo precisam escutar o canvas ANTES do OrbitControls (veja paint-input.ts).
  const brush: Brush = { ...DEFAULT_BRUSH, ...options.brush };
  const decal = new DecalTool(renderer, body, camera, SKIN_ROUGHNESS);
  const detachPaint = attachPaintInput({
    canvas,
    camera,
    target: body,
    getSurface: () => current.surface,
    brush,
    enabled: () => !decal.active,
  });
  const detachDecal = attachDecalInput(canvas, decal);

  // OrbitControls: arrastar gira, pinça/roda dá zoom, botão direito arrasta a cena.
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 0.12;
  controls.maxDistance = 1.5;
  // Guarda a posição inicial da câmera, para voltar a ela ao trocar de parte do corpo.
  controls.saveState();

  /**
   * Volta a câmera à posição inicial. Com o amortecimento ligado, um giro recente ainda tem
   * "embalo" guardado, que continuaria girando a câmera depois de voltar. Uma atualização sem
   * amortecimento gasta esse embalo de uma vez; só então voltamos à posição salva.
   */
  const resetCamera = (): void => {
    controls.enableDamping = false;
    controls.update();
    controls.reset();
    controls.enableDamping = true;
  };

  // Mantém a imagem nítida e sem distorção quando a tela muda de tamanho ou gira.
  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = fovForAspect(camera.aspect);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  renderer.setAnimationLoop(() => {
    if (rebuildPending) rebuild();
    controls.update();
    current.surface.flush();
    renderer.render(scene, camera);
  });

  return {
    setBrush(changes) {
      Object.assign(brush, changes);
    },
    clearPaint() {
      current.surface.clear();
    },
    getLayers: () => current.surface.layersState,
    addLayer: () => current.surface.addLayer(),
    removeLayer: (id) => current.surface.removeLayer(id),
    selectLayer: (id) => current.surface.selectLayer(id),
    setLayerVisible: (id, visible) => current.surface.setLayerVisible(id, visible),
    setLayerOpacity: (id, opacity) => current.surface.setLayerOpacity(id, opacity),
    moveLayer: (id, delta) => current.surface.moveLayer(id, delta),
    startDecal: (image, settings) => decal.start(image, settings),
    setDecalImage: (image) => decal.setImage(image),
    setDecalSettings: (changes) => decal.setSettings(changes),
    applyDecal(layerName) {
      if (!decal.active) return null;
      const result = current.surface.addImageLayer(decal.bake(textureSize), layerName);
      if (result) decal.stop();
      return result;
    },
    cancelDecal: () => decal.stop(),
    getBodyPart: () => partId,
    setBodyPart(id) {
      // Trocar no meio do posicionamento de um carimbo deixaria a imagem "solta": não deixamos.
      if (id === partId || decal.active) return;
      disconnect(current.surface);
      partId = id;
      current = documentFor(id);
      connect(current.surface);
      material.map = current.surface.texture;
      rebuild();
      resetCamera();
      // Os botões e o painel de camadas passam a mostrar o desenho desta parte.
      options.onHistoryChange?.(current.surface.historyState);
      options.onLayersChange?.(current.surface.layersState);
    },
    getMeasurements: () => ({ ...current.measurements }),
    setMeasurements(changes) {
      current.measurements = clampBodyMeasurements(partId, {
        ...current.measurements,
        ...changes,
      });
      rebuildPending = true;
    },
    isPlacingDecal: () => decal.active,
    // Durante o posicionamento, desfazer mexeria nas camadas por baixo da imagem: suspendemos.
    undo: () => !decal.active && current.surface.undo(),
    redo: () => !decal.active && current.surface.redo(),
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      detachPaint();
      detachDecal();
      decal.dispose();
      controls.dispose();
      disposeBodyGeometry(body.geometry);
      material.dispose();
      for (const doc of documents.values()) doc.surface.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Campo de visão vertical para uma proporção de tela.
 *
 * O campo de visão da câmera é medido na vertical. Numa tela em pé (celular na vertical), a
 * largura visível encolhe e o modelo, que é comprido, seria cortado dos lados. Então, abaixo de
 * `MIN_ASPECT`, aumentamos o campo vertical o bastante para a largura visível continuar a mesma.
 */
function fovForAspect(aspect: number): number {
  if (aspect >= MIN_ASPECT) return BASE_FOV;
  const halfHorizontal = Math.tan(MathUtils.degToRad(BASE_FOV / 2)) * MIN_ASPECT;
  return MathUtils.radToDeg(2 * Math.atan(halfHorizontal / aspect));
}
