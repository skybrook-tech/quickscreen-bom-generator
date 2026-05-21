/// <reference types="google.maps" />

import { Layers, Lock, Map as MapIcon, Loader2 } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import type { initCanvasEngine } from "./canvasEngine";
import type { CanvasOverlay } from "../../lib/googleMaps/CanvasOverlay";
import type { CanvasMapInteractionMode } from "./CanvasToolbar";

interface PropertyAnchor {
  lat: number;
  lng: number;
  address: string;
}

interface MapOverlayCanvasFrameProps {
  propertyAnchor?: PropertyAnchor | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasHostRef: RefObject<HTMLDivElement | null>;
  engine: ReturnType<typeof initCanvasEngine> | null;
  engineVersion: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  overlay?: ReactNode;
  mapInteractionMode?: CanvasMapInteractionMode;
}

type MapType = "satellite" | "hybrid";

const PROPERTY_ZOOM = 20;

export function MapOverlayCanvasFrame({
  propertyAnchor,
  canvasRef,
  canvasHostRef,
  engine,
  engineVersion: _engineVersion,
  className,
  style,
  children,
  overlay,
  mapInteractionMode = "pan",
}: MapOverlayCanvasFrameProps) {
  const anchor = useMemo(
    () =>
      propertyAnchor
        ? { lat: propertyAnchor.lat, lng: propertyAnchor.lng }
        : null,
    [propertyAnchor],
  );
  const overlayEnabled = Boolean(anchor);

  if (!overlayEnabled || !anchor) {
    return (
      <div className={className} style={style}>
        <div ref={canvasHostRef} className="h-full w-full">
          {children}
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <AnchoredMapOverlay
      anchor={anchor}
      address={propertyAnchor?.address ?? ""}
      canvasRef={canvasRef}
      canvasHostRef={canvasHostRef}
      engine={engine}
      engineVersion={_engineVersion}
      className={className}
      style={style}
      overlay={overlay}
      mapInteractionMode={mapInteractionMode}
    >
      {children}
    </AnchoredMapOverlay>
  );
}

interface AnchoredMapOverlayProps {
  anchor: { lat: number; lng: number };
  address: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasHostRef: RefObject<HTMLDivElement | null>;
  engine: ReturnType<typeof initCanvasEngine> | null;
  engineVersion: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  overlay?: ReactNode;
  mapInteractionMode: CanvasMapInteractionMode;
}

function AnchoredMapOverlay({
  anchor,
  address,
  canvasRef,
  canvasHostRef,
  engine,
  engineVersion,
  className,
  style,
  children,
  overlay,
  mapInteractionMode,
}: AnchoredMapOverlayProps) {
  const googleMaps = useGoogleMaps();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<CanvasOverlay | null>(null);
  const [mapType, setMapType] = useState<MapType>("satellite");
  const drawMode = mapInteractionMode === "draw";

  useEffect(() => {
    if (!googleMaps.ready || !mapNodeRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapNodeRef.current, {
        center: anchor,
        zoom: PROPERTY_ZOOM,
        mapTypeId: mapType,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        rotateControl: false,
        tilt: 0,
        gestureHandling: drawMode ? "none" : "greedy",
        draggable: !drawMode,
        scrollwheel: !drawMode,
        disableDoubleClickZoom: drawMode,
        keyboardShortcuts: !drawMode,
      });
      return;
    }
    mapRef.current.setCenter(anchor);
    mapRef.current.setZoom(PROPERTY_ZOOM);
  }, [anchor, googleMaps.ready]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({
      gestureHandling: drawMode ? "none" : "greedy",
      draggable: !drawMode,
      scrollwheel: !drawMode,
      disableDoubleClickZoom: drawMode,
      keyboardShortcuts: !drawMode,
    });
    overlayRef.current?.setDrawMode(drawMode);
  }, [drawMode]);

  useEffect(() => {
    let cancelled = false;
    if (
      !googleMaps.ready ||
      !mapRef.current ||
      !canvasRef.current ||
      !canvasHostRef.current ||
      !engine
    ) {
      return;
    }

    const map = mapRef.current;
    const canvas = canvasRef.current;
    const fallbackParent = canvasHostRef.current;

    void import("../../lib/googleMaps/CanvasOverlay").then(({ CanvasOverlay: LoadedOverlay }) => {
      if (cancelled) return;
      overlayRef.current?.setMap(null);
      overlayRef.current = new LoadedOverlay({
        map,
        canvas,
        fallbackParent,
        engine,
        anchor,
        drawMode,
      });
    });

    return () => {
      cancelled = true;
      overlayRef.current?.setMap(null);
      overlayRef.current = null;
    };
  }, [
    anchor,
    canvasHostRef,
    canvasRef,
    drawMode,
    engine,
    engineVersion,
    googleMaps.ready,
  ]);

  useEffect(() => {
    if (!anchor) return;
    overlayRef.current?.setAnchor(anchor);
  }, [anchor]);

  const status = googleMaps.error
    ? googleMaps.error.message
    : googleMaps.ready
      ? address
      : "Loading live map...";

  const frameClassName = `${className ?? ""} ${
    drawMode ? "ring-2 ring-brand-warning/40" : "ring-2 ring-brand-primary/40"
  }`;

  return (
    <div
      className={frameClassName}
      style={style}
      data-testid="canvas-map-overlay"
      data-map-interaction-mode={mapInteractionMode}
    >
      <div ref={mapNodeRef} className="absolute inset-0 bg-brand-bg" />
      {!googleMaps.ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-bg">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-border/50 via-brand-card to-brand-bg" />
          <div className="relative flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {googleMaps.error ? "Live map unavailable" : "Loading live map"}
          </div>
        </div>
      ) : null}
      <div
        ref={canvasHostRef}
        className="absolute inset-0 z-10 pointer-events-none"
      >
        {children}
      </div>
      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2" data-print-hide>
        <button
          type="button"
          onClick={() =>
            setMapType((value) => (value === "satellite" ? "hybrid" : "satellite"))
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-card/95 px-3 py-2 text-xs font-bold text-brand-text shadow-sm transition-colors hover:border-brand-primary hover:text-brand-primary"
          title={mapType === "satellite" ? "Show street labels" : "Hide street labels"}
        >
          <Layers size={15} />
          {mapType === "satellite" ? "Hybrid" : "Satellite"}
        </button>
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-card/95 px-3 py-2 text-xs font-bold text-brand-muted shadow-sm pointer-events-none">
        <span className="min-w-0 truncate">{status}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-brand-text">
          {drawMode ? <Lock size={13} /> : <MapIcon size={13} />}
          {drawMode ? "Draw mode: map locked" : "Pan map mode: map live"}
        </span>
      </div>
      {overlay}
    </div>
  );
}
