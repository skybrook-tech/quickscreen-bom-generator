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

  constructor(options: CanvasOverlayOptions) {
    super();
    this.map = options.map;
    this.canvas = options.canvas;
    this.fallbackParent = options.fallbackParent;
    this.engine = options.engine;
    this.anchor = options.anchor;
    this.drawMode = options.drawMode;
    setCanvasOverlayStyles(this.canvas, this.drawMode);
    this.setMap(this.map);
  }

  onAdd() {
    const panes = this.getPanes();
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

    this.listeners = [
      this.map.addListener("bounds_changed", () => this.draw()),
      this.map.addListener("zoom_changed", () => this.draw()),
      this.map.addListener("center_changed", () => this.draw()),
    ];
  }

  draw() {
    const projection = this.getProjection();
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

    this.engine.setViewportTransform({
      pan: {
        x: anchorPixel.x - left,
        y: anchorPixel.y - top,
      },
      zoom: overlayZoom,
      scale: CANVAS_METRES_SCALE,
    });
  }

  onRemove() {
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
}
