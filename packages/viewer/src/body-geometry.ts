import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { buildForearm } from '@tattdraw/body';
import type { ForearmMeasurements } from '@tattdraw/body';

/**
 * three-mesh-bvh: raycast rápido em malhas com muitos triângulos.
 *
 * Sem ajuda, um raio testa todos os ~47 mil triângulos do antebraço, um por um. A pintura lança
 * um raio por pixel percorrido pela caneta, então isso pesaria. Uma BVH ("hierarquia de caixas")
 * agrupa os triângulos em caixas dentro de caixas: o raio só desce nas caixas que atravessa e
 * testa poucas dezenas de triângulos.
 *
 * A biblioteca funciona "ensinando" o three.js: trocamos o raycast padrão de toda Mesh pelo
 * acelerado, que usa a BVH quando a geometria tem uma (e o método antigo quando não tem).
 */
let installed = false;
function installBvh(): void {
  if (installed) return;
  BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  Mesh.prototype.raycast = acceleratedRaycast;
  installed = true;
}

/** Cria a geometria do antebraço com estas medidas, já com a BVH pronta para o raycast. */
export function createForearmGeometry(measurements: ForearmMeasurements): BufferGeometry {
  installBvh();
  const data = buildForearm(measurements);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(data.normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  geometry.computeBoundingSphere();
  geometry.computeBoundsTree();
  return geometry;
}

/** Libera a geometria e a BVH dela. */
export function disposeBodyGeometry(geometry: BufferGeometry): void {
  geometry.disposeBoundsTree();
  geometry.dispose();
}
