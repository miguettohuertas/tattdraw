import { fitWithin } from '@tattdraw/paint-engine';

/** Lado máximo, em pixels, da imagem guardada para o carimbo. */
const MAX_SIDE = 2048;

/** Uma imagem pronta para virar carimbo, com os pixels originais guardados. */
export interface LoadedImage {
  name: string;
  /** Pixels como vieram do arquivo (já reduzidos, se a imagem era enorme). */
  original: ImageData;
}

/**
 * Lê um arquivo de imagem escolhido pelo usuário.
 *
 * `createImageBitmap` decodifica a imagem e já respeita a rotação gravada pela câmera do
 * celular (EXIF). Depois desenhamos num canvas, reduzindo se for preciso, para ter acesso aos
 * pixels.
 */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Este navegador não oferece canvas 2D');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return { name: file.name, original: ctx.getImageData(0, 0, width, height) };
  } finally {
    bitmap.close();
  }
}

/** Cria um canvas com estes pixels. */
export function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não oferece canvas 2D');
  ctx.putImageData(data, 0, 0);
  return canvas;
}
