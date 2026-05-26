import type {
  CanonicalMapLayerId,
  CanonicalMapSnapshot,
  CanonicalMapSnapshotLayer,
} from "../../types/canonical.types";

type StaticMapType = CanonicalMapLayerId | "hybrid";

export const STATIC_MAP_MAX_DIMENSION = 640;
export const STATIC_MAP_CAPTURE_SIZE_MULTIPLIER = 2;
export const STATIC_MAP_DEFAULT_VIEWPORT_FRACTION = 0.5;
export const GOOGLE_ATTRIBUTION_STRIP_HEIGHT_PX = 22;

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

  return {
    width: Math.min(STATIC_MAP_MAX_DIMENSION, safeWidth),
    height: Math.min(STATIC_MAP_MAX_DIMENSION, safeHeight),
  };
}

export interface MapSnapshotCaptureInput {
  centerLat: number;
  centerLng: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  capturedAt?: string;
  mobileLayerDefaults?: boolean;
}

export function createMapSnapshot(input: MapSnapshotCaptureInput): CanonicalMapSnapshot {
  const sourceViewportWidth = Math.max(1, Math.round(input.viewportWidth));
  const sourceViewportHeight = Math.max(1, Math.round(input.viewportHeight));
  const size = clampStaticMapSize(
    sourceViewportWidth * STATIC_MAP_CAPTURE_SIZE_MULTIPLIER,
    sourceViewportHeight * STATIC_MAP_CAPTURE_SIZE_MULTIPLIER,
  );
  const zoom = Math.round(input.zoom);
  return {
    centerLat: input.centerLat,
    centerLng: input.centerLng,
    zoom,
    width: size.width,
    height: size.height,
    sourceViewportWidth,
    sourceViewportHeight,
    metresPerPixel: metresPerPixelAt(input.centerLat, zoom),
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
}

export function getDefaultSnapshotViewportTransform(
  snapshot: Pick<
    CanonicalMapSnapshot,
    "width" | "height" | "sourceViewportWidth" | "sourceViewportHeight"
  >,
  viewportWidth: number,
  viewportHeight: number,
) {
  const safeViewportWidth = Math.max(1, viewportWidth || snapshot.width);
  const safeViewportHeight = Math.max(1, viewportHeight || snapshot.height);
  const visibleWorldWidth = Math.max(
    1,
    Math.min(
      snapshot.width,
      snapshot.sourceViewportWidth ??
        snapshot.width * STATIC_MAP_DEFAULT_VIEWPORT_FRACTION,
    ),
  );
  const visibleWorldHeight = Math.max(
    1,
    Math.min(
      snapshot.height,
      snapshot.sourceViewportHeight ??
        snapshot.height * STATIC_MAP_DEFAULT_VIEWPORT_FRACTION,
    ),
  );
  const zoom = Math.min(
    safeViewportWidth / visibleWorldWidth,
    safeViewportHeight / visibleWorldHeight,
  );

  return {
    zoom,
    pan: {
      x: safeViewportWidth / 2 - zoom * (snapshot.width / 2),
      y: safeViewportHeight / 2 - zoom * (snapshot.height / 2),
    },
  };
}

export type StaticMapImageLoader = (url: string) => Promise<void>;

const DEFAULT_LAYER_STATE: Record<
  CanonicalMapLayerId,
  Pick<CanonicalMapSnapshotLayer, "visible" | "opacity">
> = {
  satellite: { visible: true, opacity: 1 },
  roadmap: { visible: false, opacity: 0.5 },
};

export function isMobileTouchViewport(win: Window = window): boolean {
  return (
    win.innerWidth < 768 &&
    ((win.navigator?.maxTouchPoints ?? 0) > 0 ||
      win.matchMedia?.("(pointer: coarse)")?.matches === true)
  );
}

export const ROADMAP_BOUNDARY_EMPHASIS_STYLES = [
  "feature:poi|visibility:off",
  "feature:administrative.land_parcel|element:geometry.stroke|color:0x000000",
  "feature:administrative.land_parcel|element:geometry.stroke|weight:3",
  "feature:poi.business|visibility:off",
  "feature:poi.business|element:labels|visibility:off",
  "feature:poi.attraction|visibility:off",
  "feature:poi.government|visibility:off",
  "feature:poi.medical|visibility:off",
  "feature:poi.park|visibility:off",
  "feature:poi.place_of_worship|visibility:off",
  "feature:poi.school|visibility:off",
  "feature:poi.sports_complex|visibility:off",
  "feature:transit.station.airport|visibility:off",
  "feature:transit.station.bus|visibility:off",
  "feature:transit.station.rail|visibility:off",
  "feature:transit.line|visibility:off",
];

export const STATIC_MAP_STYLE_PARAMS = [
  "feature:road.local|element:labels|visibility:off",
  "feature:road.arterial|element:labels|lightness:30",
  "feature:transit|visibility:off",
  "feature:poi.business|visibility:off",
  "feature:poi.attraction|visibility:off",
  "feature:poi.park|element:labels|visibility:off",
  "feature:water|element:labels|visibility:off",
];

export const ROADMAP_STATIC_MAP_STYLE_PARAMS = [
  ...STATIC_MAP_STYLE_PARAMS,
  ...ROADMAP_BOUNDARY_EMPHASIS_STYLES,
];

function clampOpacity(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, Number(value)));
}

export function buildStaticMapUrl(
  snapshot: CanonicalMapSnapshot,
  apiKey: string,
  mapType: StaticMapType = "hybrid",
): string {
  const params = new URLSearchParams({
    center: `${snapshot.centerLat},${snapshot.centerLng}`,
    zoom: String(snapshot.zoom),
    size: `${snapshot.width}x${snapshot.height}`,
    maptype: mapType,
    key: apiKey,
  });
  if (mapType === "roadmap") {
    return appendStaticMapStyles(params, ROADMAP_STATIC_MAP_STYLE_PARAMS);
  }

  if (mapType === "hybrid") {
    return appendStaticMapStyles(params, STATIC_MAP_STYLE_PARAMS);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function appendStaticMapStyles(
  params: URLSearchParams,
  styles: string[],
): string {
  const styleQuery = styles.map((style) => `style=${style}`).join("&");
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&${styleQuery}`;
}

export function croppedSnapshotHeight(height: number, scale: 1 | 2 = 1): number {
  return Math.max(1, Math.round(height) - GOOGLE_ATTRIBUTION_STRIP_HEIGHT_PX * scale);
}

export async function cropAttribution(
  srcUrl: string,
  scale: 1 | 2 = 1,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const stripHeight = GOOGLE_ATTRIBUTION_STRIP_HEIGHT_PX * scale;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = Math.max(1, img.naturalHeight - stripHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load map image for crop"));
    img.src = srcUrl;
  });
}

export async function cropMapSnapshotAttribution(
  snapshot: CanonicalMapSnapshot,
  scale: 1 | 2 = 1,
  cropper: typeof cropAttribution = cropAttribution,
): Promise<CanonicalMapSnapshot> {
  const layerEntries = snapshot.layers
    ? (Object.entries(snapshot.layers) as Array<
        [CanonicalMapLayerId, CanonicalMapSnapshotLayer | undefined]
      >).filter(
        (entry): entry is [
          CanonicalMapLayerId,
          CanonicalMapSnapshotLayer & { url: string },
        ] => Boolean(entry[1]?.url),
      )
    : [];
  const shouldCropLegacyUrl = Boolean(snapshot.url);
  if (layerEntries.length === 0 && !shouldCropLegacyUrl) return snapshot;

  try {
    const croppedLayers = snapshot.layers ? { ...snapshot.layers } : undefined;
    const layerResults = await Promise.all(
      layerEntries.map(async ([layerId, layer]) => ({
        layerId,
        croppedUrl: await cropper(layer.url, scale),
      })),
    );
    for (const { layerId, croppedUrl } of layerResults) {
      const layer = snapshot.layers?.[layerId];
      if (!layer || !croppedLayers) continue;
      croppedLayers[layerId] = {
        ...layer,
        url: croppedUrl,
      };
    }
    const croppedLegacyUrl = shouldCropLegacyUrl
      ? (croppedLayers?.satellite?.url ?? await cropper(snapshot.url!, scale))
      : undefined;
    const nextHeight = croppedSnapshotHeight(snapshot.height, scale);
    const nextSourceViewportHeight =
      snapshot.sourceViewportHeight === undefined
        ? undefined
        : Math.min(snapshot.sourceViewportHeight, nextHeight);

    return {
      ...snapshot,
      height: nextHeight,
      ...(nextSourceViewportHeight !== undefined
        ? { sourceViewportHeight: nextSourceViewportHeight }
        : {}),
      ...(croppedLegacyUrl ? { url: croppedLegacyUrl } : {}),
      ...(croppedLayers ? { layers: croppedLayers } : {}),
    };
  } catch (error) {
    console.warn("Map attribution crop failed; using uncropped Static Maps image.", error);
    return snapshot;
  }
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
  input: MapSnapshotCaptureInput,
  apiKey: string,
  loadImage: StaticMapImageLoader = preloadStaticMapImage,
): Promise<CanonicalMapSnapshot> {
  const snapshot = createMapSnapshot(input);
  const satelliteUrl = buildStaticMapUrl(snapshot, apiKey, "satellite");
  const roadmapUrl = buildStaticMapUrl(snapshot, apiKey, "roadmap");
  const [satelliteResult, roadmapResult] = await Promise.allSettled([
    loadImage(satelliteUrl),
    loadImage(roadmapUrl),
  ]);

  if (satelliteResult.status === "rejected") {
    throw satelliteResult.reason;
  }
  if (roadmapResult.status === "rejected") {
    console.warn(
      "Roadmap Static Maps layer failed to preload; continuing with satellite only.",
      roadmapResult.reason,
    );
  }

  return {
    ...snapshot,
    layers: {
      satellite: {
        url: satelliteUrl,
        ...DEFAULT_LAYER_STATE.satellite,
      },
      ...(roadmapResult.status === "fulfilled"
        ? {
            roadmap: {
              url: roadmapUrl,
              ...DEFAULT_LAYER_STATE.roadmap,
            },
          }
        : {}),
    },
  };
}

export function normalizeMapSnapshot(
  snapshot: CanonicalMapSnapshot | null | undefined,
  apiKey?: string,
): CanonicalMapSnapshot | null {
  if (!snapshot) return null;
  const hasLayerShape = Boolean(snapshot.layers);
  const isLegacySingleImageSnapshot = Boolean(snapshot.url && !hasLayerShape);
  const satelliteLegacyUrl = snapshot.layers?.satellite?.url ?? snapshot.url;
  const roadmapLegacyUrl = snapshot.layers?.roadmap?.url;
  const fallbackSatelliteUrl =
    satelliteLegacyUrl ||
    (!hasLayerShape && apiKey ? buildStaticMapUrl(snapshot, apiKey, "hybrid") : null);

  const layers: CanonicalMapSnapshot["layers"] = {};
  if (fallbackSatelliteUrl || hasLayerShape) {
    layers.satellite = {
      url: fallbackSatelliteUrl ?? null,
      visible:
        snapshot.layers?.satellite?.visible ??
        DEFAULT_LAYER_STATE.satellite.visible,
      opacity: clampOpacity(
        snapshot.layers?.satellite?.opacity ??
          DEFAULT_LAYER_STATE.satellite.opacity,
      ),
    };
  }

  if (roadmapLegacyUrl || hasLayerShape || snapshot.url || (!hasLayerShape && apiKey)) {
    layers.roadmap = {
      url:
        roadmapLegacyUrl ??
        (!hasLayerShape && !snapshot.url && apiKey
          ? buildStaticMapUrl(snapshot, apiKey, "roadmap")
          : null),
      visible:
        snapshot.layers?.roadmap?.visible ??
        (isLegacySingleImageSnapshot ? false : DEFAULT_LAYER_STATE.roadmap.visible),
      opacity: clampOpacity(
        snapshot.layers?.roadmap?.opacity ??
          (isLegacySingleImageSnapshot
            ? 1
            : DEFAULT_LAYER_STATE.roadmap.opacity),
      ),
    };
  }

  if (!layers.satellite && !layers.roadmap) {
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
