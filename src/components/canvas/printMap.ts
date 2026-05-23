export interface PrintContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PrintViewport {
  zoom: number;
  pan: { x: number; y: number };
  paddedBounds: PrintContentBounds;
}

export function computePrintViewport(
  bounds: PrintContentBounds,
  canvasWidth: number,
  canvasHeight: number,
  paddingRatio = 0.1,
  maxZoom = 8,
): PrintViewport {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const padX = width * paddingRatio;
  const padY = height * paddingRatio;
  const paddedBounds = {
    minX: bounds.minX - padX,
    minY: bounds.minY - padY,
    maxX: bounds.maxX + padX,
    maxY: bounds.maxY + padY,
    width: width + padX * 2,
    height: height + padY * 2,
  };
  const zoom = Math.min(
    canvasWidth / paddedBounds.width,
    canvasHeight / paddedBounds.height,
    maxZoom,
  );

  return {
    zoom,
    pan: {
      x: canvasWidth / 2 - zoom * (paddedBounds.minX + paddedBounds.width / 2),
      y: canvasHeight / 2 - zoom * (paddedBounds.minY + paddedBounds.height / 2),
    },
    paddedBounds,
  };
}

