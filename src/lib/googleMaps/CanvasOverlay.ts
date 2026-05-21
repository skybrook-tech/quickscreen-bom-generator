/// <reference types="google.maps" />

import { metresToLatLng, type LatLngLiteral } from "../geo/coordinates";
import { CANVAS_METRES_SCALE } from "../geo/canvasGeometry";
import type { initCanvasEngine } from "../../components/canvas/canvasEngine";

type CanvasEngine = ReturnType<typeof initCanvasEngine>;

interface CanvasOverlayOptions {
  map: google.maps.Map;
  canvas: HTMLCanvasElement;
  fallbackParent: HTMLElement;
  engine: CanvasEngine;
  anchor: LatLngLiteral;
  drawMode: boolean;
}

function setCanvasOverlayStyles(canvas: HTMLCanvasElement, drawMode: boolean) {
  canvas.dataset.testid = "fence-overlay-canvas";
  canvas.setAttribute("aria-label", "Fence drawing overlay canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.background = "transparent";
  canvas.style.pointerEvents = drawMode ? "auto" : "none";
  canvas.style.touchAction = drawMode ? "none" : "auto";
}

export class CanvasOverlay extends google.maps.OverlayView {
  private readonly map: google.maps.Map;
  private readonly canvas: HTMLCanvasElement;
  private readonly fallbackParent: HTMLElement;
  private readonly engine: CanvasEngine;
  private anchor: LatLngLiteral;
  private drawMode: boolean;
  private container: HTMLDivElement | null = null;
  private listeners: google.maps.MapsEventListener[] = [];
  private diagnosticPointerListener: ((event: MouseEvent | PointerEvent) => void) | null = null;
  private viewportTransform: {
    pan: { x: number; y: number };
    zoom: number;
    scale: number;
  } | null = null;

  constructor(options: CanvasOverlayOptions) {
    super();
    this.map = options.map;
    this.canvas = options.canvas;
    this.fallbackParent = options.fallbackParent;
    this.engine = options.engine;
    this.anchor = options.anchor;
    this.drawMode = options.drawMode;
    setCanvasOverlayStyles(this.canvas, this.drawMode);
    console.log("[CanvasOverlay] constructed", {
      hasMap: !!this.getMap(),
      drawMode: this.drawMode,
    });
    console.log("[CanvasOverlay] overlay.setMap(map) called", {
      hasMap: !!this.map,
      drawMode: this.drawMode,
    });
    this.setMap(this.map);
  }

  onAdd() {
    const panes = this.getPanes();
    console.log(
      "[CanvasOverlay] onAdd fired, panes available:",
      Object.keys(panes || {}),
      "canvas element being mounted:",
      this.canvas,
    );
    if (!panes) return;

    const container = document.createElement("div");
    container.dataset.testid = "fence-overlay-canvas-pane";
    container.style.position = "absolute";
    container.style.overflow = "hidden";
    container.style.pointerEvents = this.drawMode ? "auto" : "none";
    container.style.zIndex = "1000";
    container.appendChild(this.canvas);
    panes.overlayMouseTarget.appendChild(container);
    this.container = container;
    console.log(
      "[CanvasOverlay] canvas appended to overlayMouseTarget, parent:",
      this.canvas.parentElement?.tagName,
      "getBoundingClientRect:",
      this.canvas.getBoundingClientRect(),
    );
    this.attachDiagnosticPointerLogging();

    this.listeners = [
      this.map.addListener("bounds_changed", () => this.draw()),
      this.map.addListener("zoom_changed", () => this.draw()),
      this.map.addListener("center_changed", () => this.draw()),
    ];
  }

  draw() {
    const projection = this.getProjection();
    console.log("[CanvasOverlay] draw() called, projection:", !!projection);
    const bounds = this.map.getBounds();
    if (!projection || !bounds || !this.container) return;

    const northEast = projection.fromLatLngToDivPixel(bounds.getNorthEast());
    const southWest = projection.fromLatLngToDivPixel(bounds.getSouthWest());
    const anchorPixel = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(this.anchor.lat, this.anchor.lng),
    );
    const eastPixel = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(metresToLatLng(this.anchor, 1, 0)),
    );
    const northPixel = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(metresToLatLng(this.anchor, 0, 1)),
    );

    if (!northEast || !southWest || !anchorPixel || !eastPixel || !northPixel) {
      return;
    }

    const left = southWest.x;
    const top = northEast.y;
    const width = Math.max(1, northEast.x - southWest.x);
    const height = Math.max(1, southWest.y - northEast.y);

    this.container.style.transform = `translate(${left}px, ${top}px)`;
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;

    const eastPxPerMetre = Math.hypot(
      eastPixel.x - anchorPixel.x,
      eastPixel.y - anchorPixel.y,
    );
    const northPxPerMetre = Math.hypot(
      northPixel.x - anchorPixel.x,
      northPixel.y - anchorPixel.y,
    );
    const pxPerMetre = (eastPxPerMetre + northPxPerMetre) / 2;
    const overlayZoom = pxPerMetre / CANVAS_METRES_SCALE;
    this.viewportTransform = {
      pan: {
        x: anchorPixel.x - left,
        y: anchorPixel.y - top,
      },
      zoom: overlayZoom,
      scale: CANVAS_METRES_SCALE,
    };

    this.engine.setViewportTransform({
      pan: this.viewportTransform.pan,
      zoom: overlayZoom,
      scale: CANVAS_METRES_SCALE,
    });
  }

  onRemove() {
    console.log("[CanvasOverlay] onRemove fired");
    this.detachDiagnosticPointerLogging();
    for (const listener of this.listeners) listener.remove();
    this.listeners = [];
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.fallbackParent.appendChild(this.canvas);
    setCanvasOverlayStyles(this.canvas, true);
  }

  setAnchor(anchor: LatLngLiteral) {
    this.anchor = anchor;
    this.draw();
  }

  setDrawMode(drawMode: boolean) {
    this.drawMode = drawMode;
    setCanvasOverlayStyles(this.canvas, drawMode);
    if (this.container) {
      this.container.style.pointerEvents = drawMode ? "auto" : "none";
    }
  }

  private attachDiagnosticPointerLogging() {
    this.detachDiagnosticPointerLogging();
    this.diagnosticPointerListener = (event) => {
      const targetTag =
        event.target instanceof Element ? event.target.tagName : undefined;
      console.log("[CanvasOverlay] pointer event received", {
        type: event.type,
        clientX: event.clientX,
        clientY: event.clientY,
        drawMode: this.drawMode,
        targetTag,
      });

      const metrePoint = this.eventToMetreOffset(event);
      const before = this.layoutSignal();
      window.setTimeout(() => {
        if (!this.drawMode) {
          console.log("[CanvasOverlay] click ignored, reason:", "not in draw mode");
          return;
        }
        if (!this.anchor) {
          console.log("[CanvasOverlay] click ignored, reason:", "no anchor");
          return;
        }
        if (!metrePoint) {
          console.log(
            "[CanvasOverlay] click ignored, reason:",
            "missing viewport transform or empty canvas bounds",
          );
          return;
        }

        const after = this.layoutSignal();
        if (after !== before) {
          console.log(
            `[CanvasOverlay] point added, dxMetres=${metrePoint.dxMetres}, dyMetres=${metrePoint.dyMetres}`,
          );
          return;
        }

        console.log(
          "[CanvasOverlay] click ignored, reason:",
          "layout unchanged after event; first draw point may not emit a segment yet, otherwise check active tool/run state",
        );
      }, 0);
    };
    this.canvas.addEventListener("pointerdown", this.diagnosticPointerListener);
    this.canvas.addEventListener("mousedown", this.diagnosticPointerListener);
  }

  private detachDiagnosticPointerLogging() {
    if (!this.diagnosticPointerListener) return;
    this.canvas.removeEventListener("pointerdown", this.diagnosticPointerListener);
    this.canvas.removeEventListener("mousedown", this.diagnosticPointerListener);
    this.diagnosticPointerListener = null;
  }

  private eventToMetreOffset(event: MouseEvent | PointerEvent) {
    if (!this.viewportTransform) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const canvasX =
      (event.clientX - rect.left - this.viewportTransform.pan.x) /
      this.viewportTransform.zoom;
    const canvasY =
      (event.clientY - rect.top - this.viewportTransform.pan.y) /
      this.viewportTransform.zoom;
    return {
      dxMetres: canvasX / this.viewportTransform.scale,
      dyMetres: -canvasY / this.viewportTransform.scale,
    };
  }

  private layoutSignal() {
    const layout = this.engine.getLayout();
    return JSON.stringify({
      segments: layout.segments.length,
      gates: layout.gates.length,
      totalLengthM: layout.totalLengthM,
      boundaries: layout.boundaries.length,
      textNotes: layout.textNotes?.length ?? 0,
      siteMarkers: layout.siteMarkers?.length ?? 0,
      freehandStrokes: layout.freehandStrokes?.length ?? 0,
    });
  }
}
