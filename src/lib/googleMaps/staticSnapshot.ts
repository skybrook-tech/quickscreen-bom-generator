import type {
  CanonicalMapLayerId,
  CanonicalMapSnapshot,
  CanonicalMapSnapshotLayer,
} from "../../types/canonical.types";

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

export type StaticMapImageLoader = (url: string) => Promise<void>;

const DEFAULT_LAYER_STATE: Record<
  CanonicalMapLayerId,
  Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">
> = {
  satellite: { visible: true, opacity: 1 },
  roadmap: { visible: false, opacity: 1 },
};

function clampOpacity(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, Number(value)));
}

export function buildStaticMapUrl(
  snapshot: CanonicalMapSnapshot,
  apiKey: string,
  mapType: CanonicalMapLayerId = "satellite",
): string {
  const params = new URLSearchParams({
    center: `${snapshot.centerLat},${snapshot.centerLng}`,
    zoom: String(snapshot.zoom),
    size: `${snapshot.width}x${snapshot.height}`,
    maptype: mapType,
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function preloadStaticMapImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(MAPS_STATIC_API_ENABLEMENT_MESSAGE));
    image.src = url;
  });
}

export async function createLayeredMapSnapshot(
  input: {
    centerLat: number;
    centerLng: number;
    zoom: number;
    viewportWidth: number;
    viewportHeight: number;
    capturedAt?: string;
  },
  apiKey: string,
  loadImage: StaticMapImageLoader = preloadStaticMapImage,
): Promise<CanonicalMapSnapshot> {
  const snapshot = createMapSnapshot(input);
  const satelliteUrl = buildStaticMapUrl(snapshot, apiKey, "satellite");
  const roadmapUrl = buildStaticMapUrl(snapshot, apiKey, "roadmap");

  await Promise.all([loadImage(satelliteUrl), loadImage(roadmapUrl)]);

  return {
    ...snapshot,
    layers: {
      satellite: {
        url: satelliteUrl,
        ...DEFAULT_LAYER_STATE.satellite,
      },
      roadmap: {
        url: roadmapUrl,
        ...DEFAULT_LAYER_STATE.roadmap,
      },
    },
  };
}

export function normalizeMapSnapshot(
  snapshot: CanonicalMapSnapshot | null | undefined,
  apiKey?: string,
): CanonicalMapSnapshot | null {
  if (!snapshot) return null;
  const satelliteLegacyUrl = snapshot.layers?.satellite?.url ?? snapshot.url;
  const roadmapLegacyUrl = snapshot.layers?.roadmap?.url;
  const fallbackSatelliteUrl =
    satelliteLegacyUrl || (apiKey ? buildStaticMapUrl(snapshot, apiKey, "satellite") : "");

  const layers: CanonicalMapSnapshot["layers"] = {};
  if (fallbackSatelliteUrl) {
    layers.satellite = {
      url: fallbackSatelliteUrl,
      visible:
        snapshot.layers?.satellite?.visible ??
        DEFAULT_LAYER_STATE.satellite.visible,
      opacity: clampOpacity(
        snapshot.layers?.satellite?.opacity ??
          DEFAULT_LAYER_STATE.satellite.opacity,
      ),
    };
  }
  if (roadmapLegacyUrl) {
    layers.roadmap = {
      url: roadmapLegacyUrl,
      visible:
        snapshot.layers?.roadmap?.visible ??
        DEFAULT_LAYER_STATE.roadmap.visible,
      opacity: clampOpacity(
        snapshot.layers?.roadmap?.opacity ??
          DEFAULT_LAYER_STATE.roadmap.opacity,
      ),
    };
  } else if (apiKey) {
    layers.roadmap = {
      url: buildStaticMapUrl(snapshot, apiKey, "roadmap"),
      ...DEFAULT_LAYER_STATE.roadmap,
    };
  }

  if (Object.keys(layers).length === 0) {
    return snapshot;
  }

  return {
    ...snapshot,
    layers,
  };
}

export function updateMapSnapshotLayer(
  snapshot: CanonicalMapSnapshot,
  layerId: CanonicalMapLayerId,
  updates: Partial<Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">>,
): CanonicalMapSnapshot {
  const normalized = normalizeMapSnapshot(snapshot) ?? snapshot;
  const existing = normalized.layers?.[layerId];
  if (!existing) return normalized;

  return {
    ...normalized,
    layers: {
      ...normalized.layers,
      [layerId]: {
        ...existing,
        ...updates,
        opacity: clampOpacity(updates.opacity ?? existing.opacity),
      },
    },
  };
}
