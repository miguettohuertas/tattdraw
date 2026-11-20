import { buildLimb, clampLimb } from './limb';
import type { LimbMeasurements, LimbResolution, LimbShape, MeasurementLimits } from './limb';
import type { MeshData } from './mesh-data';

export type BodyPartId = 'forearm' | 'upperArm';

/** Nome e explicação de uma medida, como aparecem no painel. */
export interface MeasurementField {
  label: string;
  hint: string;
}

/**
 * Uma parte do corpo: a receita da forma, as medidas padrão, os limites e como cada medida se
 * chama para o tatuador. Para criar uma parte nova (panturrilha, coxa), basta uma entrada nova
 * em `BODY_PARTS`; o resto do app não muda.
 */
export interface BodyPart {
  id: BodyPartId;
  name: string;
  shape: LimbShape;
  defaults: LimbMeasurements;
  limits: MeasurementLimits;
  fields: Record<keyof LimbMeasurements, MeasurementField>;
}

/**
 * Antebraço, do punho (distal) ao cotovelo (proximal).
 *
 * Punho achatado (bem mais largo que grosso), mais redondo perto do cotovelo, e a saliência do
 * braquiorradial (a "barriga" do antebraço) no lado do polegar, no terço perto do cotovelo.
 * A costura fica no lado do mindinho. Visto da câmera: costas do antebraço de frente, polegar
 * para cima.
 */
const FOREARM: BodyPart = {
  id: 'forearm',
  name: 'Antebraço',
  shape: {
    peakT: 0.7,
    flatness: [1.45, 1.12],
    bulges: [
      { angle: 0.72 * Math.PI, spread: 0.55, amount: 0.07, rise: [0.2, 0.7], fall: [0.85, 1] },
    ],
    seamOffset: 0,
    capLength: [0.6, 0.6],
  },
  defaults: { lengthCm: 26, distalCm: 16, peakCm: 26, proximalCm: 24 },
  limits: {
    lengthCm: { min: 16, max: 36 },
    distalCm: { min: 11, max: 24 },
    peakCm: { min: 16, max: 42 },
    proximalCm: { min: 16, max: 40 },
  },
  fields: {
    lengthCm: { label: 'Comprimento', hint: 'Do punho à dobra do cotovelo' },
    distalCm: { label: 'Punho', hint: 'Circunferência logo acima do osso do punho' },
    peakCm: { label: 'Antebraço', hint: 'Circunferência na parte mais grossa' },
    proximalCm: { label: 'Cotovelo', hint: 'Circunferência logo abaixo da dobra do cotovelo' },
  },
};

/**
 * Braço, do cotovelo (distal) até a altura da axila (proximal).
 *
 * Visto da câmera: lado de fora do braço de frente, bíceps para cima e tríceps para baixo.
 * - Bíceps na frente, mais alto no meio do braço.
 * - Tríceps atrás, mais longo, indo até perto do ombro.
 * - Deltoide no lado de fora, no alto, arredondando a ponta do ombro.
 * - Perto do cotovelo a seção é mais larga de um lado ao outro (os ossos do cotovelo).
 * A costura fica atrás e por dentro, entre o tríceps e a parte de dentro do braço, que é o lugar
 * menos visto (fica encostado no corpo).
 */
const UPPER_ARM: BodyPart = {
  id: 'upperArm',
  name: 'Braço',
  shape: {
    peakT: 0.55,
    flatness: [0.85, 1.05],
    bulges: [
      { angle: Math.PI, spread: 0.6, amount: 0.09, rise: [0.15, 0.5], fall: [0.7, 0.95] },
      { angle: 0.15, spread: 0.7, amount: 0.06, rise: [0.25, 0.6], fall: [0.85, 1] },
      { angle: Math.PI / 2 + 0.2, spread: 0.75, amount: 0.1, rise: [0.72, 0.95] },
    ],
    seamOffset: -Math.PI / 4,
    capLength: [0.6, 0.8],
  },
  defaults: { lengthCm: 32, distalCm: 25, peakCm: 30, proximalCm: 32 },
  limits: {
    lengthCm: { min: 22, max: 44 },
    distalCm: { min: 18, max: 40 },
    peakCm: { min: 20, max: 55 },
    proximalCm: { min: 22, max: 58 },
  },
  fields: {
    lengthCm: { label: 'Comprimento', hint: 'Da dobra do cotovelo até a altura da axila' },
    distalCm: { label: 'Cotovelo', hint: 'Circunferência logo acima da dobra do cotovelo' },
    peakCm: { label: 'Bíceps', hint: 'Circunferência na parte mais grossa, com o braço relaxado' },
    proximalCm: { label: 'Axila', hint: 'Circunferência no alto do braço, na altura da axila' },
  },
};

export const BODY_PARTS: Record<BodyPartId, BodyPart> = {
  forearm: FOREARM,
  upperArm: UPPER_ARM,
};

/** Ordem em que as partes aparecem para o usuário. */
export const BODY_PART_ORDER: BodyPartId[] = ['forearm', 'upperArm'];

/** Prende as medidas dentro dos limites da parte. */
export function clampBodyMeasurements(id: BodyPartId, m: LimbMeasurements): LimbMeasurements {
  return clampLimb(m, BODY_PARTS[id].limits);
}

/** Gera a malha de uma parte do corpo com estas medidas (presas aos limites da parte). */
export function buildBodyPart(
  id: BodyPartId,
  measurements: LimbMeasurements,
  resolution: Partial<LimbResolution> = {},
): MeshData {
  const part = BODY_PARTS[id];
  return buildLimb(part.shape, clampLimb(measurements, part.limits), resolution);
}
