/**
 * Uma malha 3D em listas de números, no formato que a placa de vídeo usa:
 * - `positions`: x, y, z de cada vértice (em metros);
 * - `normals`: a direção "para fora" da pele em cada vértice (tamanho 1);
 * - `uvs`: onde cada vértice cai na textura (u e v de 0 a 1);
 * - `indices`: os triângulos, de três em três índices de vértice, em sentido anti-horário
 *   vistos de fora (é assim que a placa de vídeo sabe qual lado é a frente).
 */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}
