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

export interface Viewer {
  /** Libera GPU, eventos e o loop de desenho. Chame ao sair da tela. */
  dispose(): void;
}

/**
 * Cria a cena 3D dentro de um <canvas>.
 *
 * Por enquanto mostra uma cápsula no lugar do braço: é um modelo provisório até
 * escolhermos o modelo do corpo (MakeHuman ou próprio, veja docs/adr).
 */
export function createViewer(canvas: HTMLCanvasElement): Viewer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  scene.background = new Color(0x1d1d22);

  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  camera.position.set(0, 0.2, 1.4);

  // OrbitControls: arrastar gira, pinça/roda dá zoom. Funciona com dedo e mouse.
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 0.4;
  controls.maxDistance = 4;

  scene.add(new AmbientLight(0xffffff, 0.6));
  const keyLight = new DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(1, 2, 1.5);
  scene.add(keyLight);

  // Modelo provisório: uma cápsula com cor de pele, deitada como um antebraço.
  const geometry = new CapsuleGeometry(0.12, 0.7, 16, 48);
  const material = new MeshStandardMaterial({ color: 0xd9a58a, roughness: 0.6 });
  const forearm = new Mesh(geometry, material);
  forearm.rotation.z = Math.PI / 2;
  scene.add(forearm);

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
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
