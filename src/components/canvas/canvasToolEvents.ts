export const ACTIVATE_CANVAS_DRAW_TOOL_EVENT = "qsbom:activate-canvas-draw-tool";

export interface ActivateCanvasDrawToolDetail {
  runId?: string;
  productCode?: string;
  source: "fence-system-picker";
}

export function dispatchActivateCanvasDrawTool(detail: ActivateCanvasDrawToolDetail) {
  window.dispatchEvent(
    new CustomEvent<ActivateCanvasDrawToolDetail>(ACTIVATE_CANVAS_DRAW_TOOL_EVENT, {
      detail,
    }),
  );
}
