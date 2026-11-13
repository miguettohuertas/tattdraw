// Ponto de entrada público do pacote: só o que for exportado aqui pode ser usado pelos apps.
export { uvToPixel } from './uv';
export type { Pixel, UV } from './uv';
export { interpolateStroke } from './stroke';
export type { StrokePoint } from './stroke';
export { brushRadius, uvScaleFromTriangle } from './brush';
export type { Vec2, Vec3 } from './brush';
export { History } from './history';
export type { HistoryOptions } from './history';
export { includeEllipse, toPixelRect } from './dirty-rect';
export type { Bounds, PixelRect } from './dirty-rect';
