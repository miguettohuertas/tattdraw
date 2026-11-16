import type { Viewer } from '@tattdraw/viewer';
import { hasTransparency, layerNameFromFile, whiteToAlpha } from '@tattdraw/paint-engine';
import { getElement } from './dom';
import { imageDataToCanvas, loadImageFile } from './image-loader';
import type { LoadedImage } from './image-loader';
import { showToast } from './toast';

/** Tamanho inicial do carimbo: o lado maior da imagem na pele, em milímetros. */
const DEFAULT_SIZE_MM = 60;

/**
 * Importar imagem e posicionar o carimbo.
 *
 * Fluxo: botão de imagem → o sistema abre a galeria/arquivos → a imagem aparece no centro da
 * tela, sobre a pele → a barra de baixo ajusta tamanho, rotação e fundo branco → Aplicar grava
 * numa camada nova; Cancelar descarta.
 *
 * Enquanto se posiciona, a barra de cima some (via a classe `placing` no <body>), para ninguém
 * trocar de camada ou desfazer no meio do caminho.
 */
export function setupDecalControls(viewer: Viewer): () => void {
  const importButton = getElement<HTMLButtonElement>('#import-image');
  const fileInput = getElement<HTMLInputElement>('#image-file');
  const sizeInput = getElement<HTMLInputElement>('#decal-size');
  const sizeLabel = getElement<HTMLElement>('#decal-size-label');
  const rotationInput = getElement<HTMLInputElement>('#decal-rotation');
  const rotationLabel = getElement<HTMLElement>('#decal-rotation-label');
  const whiteButton = getElement<HTMLButtonElement>('#decal-white');
  const cancelButton = getElement<HTMLButtonElement>('#decal-cancel');
  const applyButton = getElement<HTMLButtonElement>('#decal-apply');

  let image: LoadedImage | null = null;
  let removeWhite = false;

  /** A imagem como vai para a pele: a original, ou com o branco transformado em transparente. */
  const prepared = (): HTMLCanvasElement => {
    if (!image) throw new Error('Nenhuma imagem carregada');
    if (!removeWhite) return imageDataToCanvas(image.original);
    const copy = new ImageData(
      new Uint8ClampedArray(image.original.data),
      image.original.width,
      image.original.height,
    );
    whiteToAlpha(copy.data);
    return imageDataToCanvas(copy);
  };

  const setPlacing = (placing: boolean): void => {
    document.body.classList.toggle('placing', placing);
  };

  const showSettings = (sizeMm: number, rotationDeg: number): void => {
    sizeInput.value = String(sizeMm);
    sizeLabel.textContent = `${sizeMm} mm`;
    rotationInput.value = String(rotationDeg);
    rotationLabel.textContent = `${rotationDeg}°`;
    whiteButton.setAttribute('aria-pressed', String(removeWhite));
  };

  const finish = (): void => {
    image = null;
    setPlacing(false);
  };

  const start = async (file: File): Promise<void> => {
    try {
      image = await loadImageFile(file);
    } catch {
      showToast('Não foi possível abrir essa imagem.');
      return;
    }
    // Imagem sem nenhuma transparência (JPG, foto, desenho escaneado) quase sempre tem fundo
    // branco: já começamos removendo. O botão deixa desligar.
    removeWhite = !hasTransparency(image.original.data);
    showSettings(DEFAULT_SIZE_MM, 0);
    viewer.startDecal(prepared(), { sizeMm: DEFAULT_SIZE_MM, rotationDeg: 0 });
    setPlacing(true);
  };

  const apply = (): void => {
    if (!image || !viewer.isPlacingDecal()) return;
    const result = viewer.applyDecal(layerNameFromFile(image.name));
    if (result === 'active-layer') {
      showToast('Limite de camadas atingido: a imagem foi para a camada escolhida.');
    }
    if (result) finish();
  };

  const cancel = (): void => {
    if (!viewer.isPlacingDecal()) return;
    viewer.cancelDecal();
    finish();
  };

  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    // Limpar o valor permite escolher o mesmo arquivo de novo depois.
    fileInput.value = '';
    if (file) void start(file);
  });

  sizeInput.addEventListener('input', () => {
    const sizeMm = Number(sizeInput.value);
    sizeLabel.textContent = `${sizeMm} mm`;
    viewer.setDecalSettings({ sizeMm });
  });
  rotationInput.addEventListener('input', () => {
    const rotationDeg = Number(rotationInput.value);
    rotationLabel.textContent = `${rotationDeg}°`;
    viewer.setDecalSettings({ rotationDeg });
  });
  whiteButton.addEventListener('click', () => {
    removeWhite = !removeWhite;
    whiteButton.setAttribute('aria-pressed', String(removeWhite));
    viewer.setDecalImage(prepared());
  });
  cancelButton.addEventListener('click', cancel);
  applyButton.addEventListener('click', apply);

  // Atalhos durante o posicionamento: Enter aplica, Esc cancela.
  const onKeyDown = (e: KeyboardEvent): void => {
    if (!viewer.isPlacingDecal()) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  return () => window.removeEventListener('keydown', onKeyDown);
}
