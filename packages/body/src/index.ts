// Ponto de entrada público do pacote.
export type { MeshData } from './mesh-data';
export { buildLimb, clampLimb, limbCircumferenceAt, perimeter } from './limb';
export type { Bulge, LimbMeasurements, LimbResolution, LimbShape, MeasurementLimits } from './limb';
export { BODY_PART_ORDER, BODY_PARTS, buildBodyPart, clampBodyMeasurements } from './parts';
export type { BodyPart, BodyPartId, MeasurementField } from './parts';
