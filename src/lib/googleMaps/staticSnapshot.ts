import type { CanonicalMapSnapshot } from "../../types/canonical.types";

export const STATIC_MAP_MAX_DIMENSION = 640;

export const MAPS_STATIC_API_ENABLEMENT_MESSAGE =
  "Maps Static API could not load this property view. Enable Maps Static API in Google Cloud Console: APIs & Services > Library > Maps Static API > Enable, then add Maps Static API to the allowed APIs on the existing Google Maps API key.";

export function metresPerPixelAt(latitude: number, zoom: number): number {
  return (
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) /
    Math.pow(2, zoom)
  );
}

export function clampStaticMapSize(width: number, height: number) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const ratio = Math.min(
    1,
    STATIC_MAP_MAX_DIMENSION / safeWidth,
    STATIC_MAP_MAX_DIMENSION / safeHeight,
  );

  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio)),
  };
}

export function createMapSnapshot(input: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  capturedAt?: string;
}): CanonicalMapSnapshot {
  const size = clampStaticMapSize(input.viewportWidth, input.viewportHeight);
  const zoom = Math.round(input.zoom);
  return {
    centerLat: input.centerLat,
    centerLng: input.centerLng,
    zoom,
    width: size.width,
    height: size.height,
    metresPerPixel: metresPerPixelAt(input.centerLat, zoom),
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
}

export function buildStaticMapUrl(
  snapshot: CanonicalMapSnapshot,
  apiKey: string,
): string {
  const params = new URLSearchParams({
    center: `${snapshot.centerLat},${snapshot.centerLng}`,
    zoom: String(snapshot.zoom),
    size: `${snapshot.width}x${snapshot.height}`,
    maptype: "satellite",
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
