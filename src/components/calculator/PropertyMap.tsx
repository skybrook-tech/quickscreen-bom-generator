/// <reference types="google.maps" />

import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { GOOGLE_MAPS_MISSING_API_KEY_MESSAGE } from "../../lib/googleMaps/loader";
import {
  createLayeredMapSnapshot,
  isMobileTouchViewport,
  MAPS_STATIC_API_ENABLEMENT_MESSAGE,
  type MapSnapshotCaptureInput,
} from "../../lib/googleMaps/staticSnapshot";
import type { CanonicalMapSnapshot } from "../../types/canonical.types";
import { AddressInput, type LocatedAddress } from "./AddressInput";

type MapType = "satellite" | "hybrid" | "roadmap" | "terrain";

export interface PropertyAnchor {
  anchorLat: number;
  anchorLng: number;
  formattedAddress: string;
  snapshot: CanonicalMapSnapshot;
}

interface PropertyMapProps {
  initialAnchor?: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  initialSnapshot?: CanonicalMapSnapshot | null;
  onAnchorConfirmed: (anchor: PropertyAnchor) => void;
}

interface PropertyAnchorFormGateProps {
  anchorConfirmed: boolean;
  children: ReactNode;
}

const DEFAULT_CENTER = { lat: -25, lng: 133 };
const DEFAULT_ZOOM = 4;
const PROPERTY_ZOOM = 20;
const DEFAULT_SNAPSHOT_WIDTH = 640;
const DEFAULT_SNAPSHOT_HEIGHT = 480;
export const PROPERTY_MAP_INTERACTION_OPTIONS = {
  gestureHandling: "greedy",
  zoomControl: true,
  draggable: true,
  scrollwheel: true,
  keyboardShortcuts: true,
} as const;

export function PropertyAnchorFormGate({ children }: PropertyAnchorFormGateProps) {
  return <div>{children}</div>;
}

export function PropertyMap({
  initialAnchor,
  initialSnapshot,
  onAnchorConfirmed,
}: PropertyMapProps) {
  const [located, setLocated] = useState<LocatedAddress | null>(
    initialAnchor
      ? {
          address: initialAnchor.address,
          formattedAddress: initialAnchor.address,
          lat: initialAnchor.lat,
          lng: initialAnchor.lng,
        }
      : null,
  );
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialAnchor ? { lat: initialAnchor.lat, lng: initialAnchor.lng } : null,
  );
  const [confirmed, setConfirmed] = useState(Boolean(initialAnchor));
  const [editing, setEditing] = useState(!initialAnchor);
  const [mapRequested, setMapRequested] = useState(Boolean(initialAnchor));

  useEffect(() => {
    if (!initialAnchor) return;
    setLocated({
      address: initialAnchor.address,
      formattedAddress: initialAnchor.address,
      lat: initialAnchor.lat,
      lng: initialAnchor.lng,
    });
    setPin({ lat: initialAnchor.lat, lng: initialAnchor.lng });
    setConfirmed(true);
    setEditing(false);
    setMapRequested(true);
  }, [initialAnchor]);

  function handleConfirmFromExpanded(snapshot: CanonicalMapSnapshot) {
    if (!pin || !located) return;
    setConfirmed(true);
    setEditing(false);
    onAnchorConfirmed({
      anchorLat: pin.lat,
      anchorLng: pin.lng,
      formattedAddress: located.formattedAddress,
      snapshot,
    });
  }

  if (confirmed && located && !editing) {
    return (
      <section
        data-testid="property-map-collapsed"
        className="rounded-xl border border-brand-border/70 bg-brand-card px-3 py-2 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-muted">
              Captured property view
            </p>
            <p className="truncate text-sm font-bold text-brand-text">
              {located.formattedAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                initialSnapshot &&
                !window.confirm(
                  "Change view? Existing fence drawings will stay in place but the satellite background will move.",
                )
              ) {
                return;
              }
              setEditing(true);
              setMapRequested(true);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <MapPin size={15} />
            Change view
          </button>
        </div>
      </section>
    );
  }

  return (
    <ExpandedPropertyMap
      located={located}
      pin={pin}
      confirmed={confirmed}
      mapRequested={mapRequested}
      initialSnapshot={initialSnapshot ?? null}
      onMapRequested={() => setMapRequested(true)}
      onLocated={(location) => {
        setMapRequested(true);
        setLocated(location);
        setPin({ lat: location.lat, lng: location.lng });
        setConfirmed(false);
      }}
      onPinChange={(nextPin) => {
        setPin(nextPin);
        setConfirmed(false);
      }}
      onConfirm={handleConfirmFromExpanded}
    />
  );
}

interface ExpandedPropertyMapProps {
  located: LocatedAddress | null;
  pin: { lat: number; lng: number } | null;
  confirmed: boolean;
  mapRequested: boolean;
  initialSnapshot: CanonicalMapSnapshot | null;
  onMapRequested: () => void;
  onLocated: (location: LocatedAddress) => void;
  onPinChange: (pin: { lat: number; lng: number }) => void;
  onConfirm: (snapshot: CanonicalMapSnapshot) => void;
}

function ExpandedPropertyMap({
  located,
  pin,
  confirmed,
  mapRequested,
  initialSnapshot,
  onMapRequested,
  onLocated,
  onPinChange,
  onConfirm,
}: ExpandedPropertyMapProps) {
  const [mapType, setMapType] = useState<MapType>("satellite");
  const snapshotReaderRef = useRef<(() => MapSnapshotCaptureInput | null) | null>(null);
  const [capturingSnapshot, setCapturingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const mapStatus = mapRequested
    ? "Search for the property, then drag the pin if the roofline needs fine tuning."
    : "Enter an address to locate the property.";

  function readSnapshotInput(): MapSnapshotCaptureInput {
    const fromMap = snapshotReaderRef.current?.();
    if (fromMap) return fromMap;
    const center = pin ?? located ?? DEFAULT_CENTER;
    return {
      centerLat: center.lat,
      centerLng: center.lng,
      zoom: pin ? PROPERTY_ZOOM : DEFAULT_ZOOM,
      viewportWidth: DEFAULT_SNAPSHOT_WIDTH,
      viewportHeight: DEFAULT_SNAPSHOT_HEIGHT,
      mobileLayerDefaults: isMobileTouchViewport(),
    };
  }

  async function handleUseView() {
    const snapshotInput = {
      ...readSnapshotInput(),
      mobileLayerDefaults: isMobileTouchViewport(),
    };
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) {
      setSnapshotError(GOOGLE_MAPS_MISSING_API_KEY_MESSAGE);
      return;
    }

    setCapturingSnapshot(true);
    setSnapshotError(null);
    try {
      const layeredSnapshot = await createLayeredMapSnapshot(
        snapshotInput,
        apiKey,
      );
      onConfirm(layeredSnapshot);
    } catch {
      setSnapshotError(MAPS_STATIC_API_ENABLEMENT_MESSAGE);
    } finally {
      setCapturingSnapshot(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-brand-border/70 bg-brand-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-muted">
            Property map
          </p>
          <p className="mt-1 text-sm font-semibold text-brand-text">
            {confirmed && located ? located.formattedAddress : mapStatus}
          </p>
        </div>
        {mapRequested ? (
          <label className="inline-flex items-center gap-2 text-xs font-bold text-brand-muted">
            Map
            <select
              value={mapType}
              onChange={(event) => setMapType(event.target.value as MapType)}
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              aria-label="Property map type"
              title="Property map type"
            >
              <option value="satellite">Satellite</option>
              <option value="hybrid">Hybrid</option>
              <option value="roadmap">Roadmap</option>
              <option value="terrain">Terrain</option>
            </select>
          </label>
        ) : null}
      </div>

      <AddressInput onLocated={onLocated} onEngaged={onMapRequested} />

      {mapRequested ? (
        <PropertyMapCanvas
          pin={pin}
          mapType={mapType}
          initialSnapshot={initialSnapshot}
          onPinChange={onPinChange}
          onSnapshotReaderChange={(reader) => {
            snapshotReaderRef.current = reader;
          }}
        />
      ) : null}

      {pin && located ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-bg/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-bold text-brand-text">{located.formattedAddress}</p>
            <p className="mt-1 text-xs font-semibold text-brand-muted">
              Pin: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
            </p>
            {snapshotError ? (
              <p className="mt-2 text-xs font-bold text-brand-danger">
                {snapshotError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleUseView()}
            disabled={capturingSnapshot}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 disabled:cursor-wait disabled:opacity-70"
          >
            {capturingSnapshot ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : confirmed ? (
              <CheckCircle2 size={16} />
            ) : (
              <MapPin size={16} />
            )}
            {capturingSnapshot ? "Capturing" : "Use this view"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

interface PropertyMapCanvasProps {
  pin: { lat: number; lng: number } | null;
  mapType: MapType;
  initialSnapshot: CanonicalMapSnapshot | null;
  onPinChange: (pin: { lat: number; lng: number }) => void;
  onSnapshotReaderChange: (
    reader: (() => MapSnapshotCaptureInput | null) | null,
  ) => void;
}

function PropertyMapCanvas({
  pin,
  mapType,
  initialSnapshot,
  onPinChange,
  onSnapshotReaderChange,
}: PropertyMapCanvasProps) {
  const googleMaps = useGoogleMaps();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const preserveInitialViewRef = useRef(Boolean(initialSnapshot));

  useEffect(() => {
    if (!googleMaps.ready || !mapNodeRef.current || mapRef.current) return;
    const center = initialSnapshot
      ? { lat: initialSnapshot.centerLat, lng: initialSnapshot.centerLng }
      : pin ?? DEFAULT_CENTER;
    mapRef.current = new google.maps.Map(mapNodeRef.current, {
      center,
      zoom: initialSnapshot?.zoom ?? (pin ? PROPERTY_ZOOM : DEFAULT_ZOOM),
      mapTypeId: mapType,
      ...PROPERTY_MAP_INTERACTION_OPTIONS,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      rotateControl: false,
      tilt: 0,
    });
  }, [googleMaps.ready, initialSnapshot, mapType, pin]);

  useEffect(() => {
    mapRef.current?.setMapTypeId(mapType);
  }, [mapType]);

  useEffect(() => {
    if (!googleMaps.ready || !mapRef.current || !pin) return;
    const position = new google.maps.LatLng(pin.lat, pin.lng);
    const preserveView = preserveInitialViewRef.current;
    preserveInitialViewRef.current = false;
    if (!preserveView) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(PROPERTY_ZOOM);
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position,
        draggable: true,
        title: "Property location",
      });
      markerRef.current.addListener("dragend", () => {
        const markerPosition = markerRef.current?.getPosition();
        if (!markerPosition) return;
        onPinChange({ lat: markerPosition.lat(), lng: markerPosition.lng() });
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }
  }, [googleMaps.ready, onPinChange, pin]);

  useEffect(() => {
    if (!googleMaps.ready || !mapRef.current || !mapNodeRef.current) {
      onSnapshotReaderChange(null);
      return;
    }

    onSnapshotReaderChange(() => {
      const map = mapRef.current;
      const node = mapNodeRef.current;
      const center = map?.getCenter();
      if (!map || !node || !center) return null;
      return {
        centerLat: center.lat(),
        centerLng: center.lng(),
        zoom: map.getZoom() ?? PROPERTY_ZOOM,
        viewportWidth: node.clientWidth || DEFAULT_SNAPSHOT_WIDTH,
        viewportHeight: node.clientHeight || DEFAULT_SNAPSHOT_HEIGHT,
      };
    });

    return () => onSnapshotReaderChange(null);
  }, [googleMaps.ready, onSnapshotReaderChange]);

  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-xl border border-brand-border bg-brand-bg aspect-[4/3] md:aspect-video">
      {!googleMaps.ready ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-bg">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-border/40 via-brand-card to-brand-bg" />
          <div className="relative flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {googleMaps.error ? "Map unavailable" : "Loading map"}
          </div>
        </div>
      ) : null}
      <div ref={mapNodeRef} className="h-full w-full" aria-label="Property satellite map" />
    </div>
  );
}
