import type { MetreOffset } from "./coordinates";

export const CANVAS_METRES_SCALE = 100;

export interface CanvasPoint {
  x: number;
  y: number;
}

export function canvasPointToMetreOffset(point: CanvasPoint): MetreOffset {
  return {
    dxMetres: point.x / CANVAS_METRES_SCALE,
    dyMetres: -point.y / CANVAS_METRES_SCALE,
  };
}

export function metreOffsetToCanvasPoint(offset: MetreOffset): CanvasPoint {
  return {
    x: offset.dxMetres * CANVAS_METRES_SCALE,
    y: -offset.dyMetres * CANVAS_METRES_SCALE,
  };
}
