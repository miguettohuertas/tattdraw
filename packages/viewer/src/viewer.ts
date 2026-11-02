import {
  AmbientLight,
  CapsuleGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { attachPaintInput } from './paint-input';
import type { Brush } from './paint-input';
import { PaintSurface } from './paint-surface';

export interface ViewerOptions {
  /** Lado da textura de pintura, em pixels. Padrão 2048. Use 4096 para testar o limite. */
  textureSize?: number;
  brush?: Partial<Brush>;
}

export interface Viewer {
  /** Apaga toda a pintura. */
  clearPaint(): void;
  /** Libera GPU, eventos e o loop de desenho. Chame ao sair da tela. */
  dispose(): void;
}

const SKIN_COLOR = '#d9a58a';
const DEFAULT_BRUSH: Brush = { radius: 0.0025, color: '#1a1a1a' };

/**
 * Cria a cena 3D dentro de um <canvas> e liga a pintura.
 *
 * As medidas estão em metros. O modelo provisório é uma cápsula do tamanho aproximado de um
 * antebraço (4 cm de raio, 30 cm de comprimento) até escolhermos o modelo do corpo.
 */
export function createViewer(canvas: HTMLCanvasElement, options: ViewerOptions = {}): Viewer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  scene.background = new Color(0x1d1d22);

  const camera = new PerspectiveCamera(40, 1, 0.01, 10);
  camera.position.set(0, 0.08, 0.5);

  scene.add(new AmbientLight(0xffffff, 0.6));
  const keyLight = new DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(1, 2, 1.5);
  scene.add(keyLight);

  // A pele é uma textura em que se pode pintar. Cor branca no material para não tingir a textura.
  const surface = new PaintSurface(options.textureSize ?? 2048, SKIN_COLOR);
  const geometry = new CapsuleGeometry(0.04, 0.22, 16, 64);
  const material = new MeshStandardMaterial({ map: surface.texture, roughness: 0.6 });
  const forearm = new Mesh(geometry, material);
  forearm.rotation.z = Math.PI / 2;
  scene.add(forearm);
  forearm.updateMatrixWorld();

  // A pintura precisa escutar o canvas ANTES do OrbitControls (veja paint-input.ts).
  const detachPaint = attachPaintInput({
    canvas,
    camera,
    target: forearm,
    surface,
    brush: { ...DEFAULT_BRUSH, ...options.brush },
  });

  // OrbitControls: arrastar gira, pinça/roda dá zoom, botão direito arrasta a cena.
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 0.12;
  controls.maxDistance = 1.5;

  // Mantém a imagem nítida e sem distorção quando a tela muda de tamanho ou gira.
  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    surface.flush();
    renderer.render(scene, camera);
  });

  return {
    clearPaint() {
      surface.clear();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      detachPaint();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      surface.dispose();
      renderer.dispose();
    },
  };
}
