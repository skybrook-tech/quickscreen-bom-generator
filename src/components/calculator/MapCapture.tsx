import { useEffect, useRef, useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { AddressInput, type LocatedAddress } from "./AddressInput";
import {
  createLayeredMapSnapshot,
  cropMapSnapshotAttribution,
  isMobileTouchViewport,
} from "../../lib/googleMaps/staticSnapshot";
import type { CanonicalMapSnapshot } from "../../types/canonical.types";

interface MapCaptureProps {
  onConfirm: (anchor: {
    lat: number;
    lng: number;
    address: string;
    snapshot: CanonicalMapSnapshot | null;
  }) => void;
  onSkip: () => void;
}

const DEFAULT_CENTER = { lat: -25, lng: 133 };
const DEFAULT_ZOOM = 4;
const PROPERTY_ZOOM = 19;

export function MapCapture({ onConfirm, onSkip }: MapCaptureProps) {
  const googleMaps = useGoogleMaps();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [located, setLocated] = useState<LocatedAddress | null>(null);
  const [capturingSnapshot, setCapturingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!googleMaps.ready || !mapNodeRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapNodeRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeId: "hybrid",
      gestureHandling: "greedy",
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      zoomControl: false,
      rotateControl: false,
      tilt: 0,
    });
    mapRef.current = map;

    const AU_BOUNDS = new google.maps.LatLngBounds(
      { lat: -44.5, lng: 110 },
      { lat: -9, lng: 156 }
    );
    map.fitBounds(AU_BOUNDS);
  }, [googleMaps.ready]);

  // Adjust zoom and location based on geocoded located address
  useEffect(() => {
    if (!googleMaps.ready || !mapRef.current) return;

    if (located) {
      const position = new google.maps.LatLng(located.lat, located.lng);
      mapRef.current.setCenter(position);
      mapRef.current.setZoom(PROPERTY_ZOOM);
      mapRef.current.setOptions({
        zoomControl: true,
        mapTypeControl: true,
      });

      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position,
          draggable: true,
          title: "Drag to center your property",
        });
        markerRef.current.addListener("dragend", () => {
          const pos = markerRef.current?.getPosition();
          if (pos) {
            setLocated((prev) =>
              prev
                ? {
                    ...prev,
                    lat: pos.lat(),
                    lng: pos.lng(),
                  }
                : null
            );
          }
        });
      } else {
        markerRef.current.setPosition(position);
        markerRef.current.setMap(mapRef.current);
      }
    } else {
      // Revert to landing zoom
      const AU_BOUNDS = new google.maps.LatLngBounds(
        { lat: -44.5, lng: 110 },
        { lat: -9, lng: 156 }
      );
      mapRef.current.fitBounds(AU_BOUNDS);
      mapRef.current.setOptions({
        zoomControl: false,
        mapTypeControl: false,
      });
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  }, [googleMaps.ready, located]);

  async function handleUseView() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) {
      setSnapshotError("VITE_GOOGLE_MAPS_API_KEY is not configured.");
      return;
    }
    if (!located || !mapRef.current || !mapNodeRef.current) return;

    setCapturingSnapshot(true);
    setSnapshotError(null);

    try {
      const center = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom() ?? PROPERTY_ZOOM;
      const clientWidth = mapNodeRef.current.clientWidth || 640;
      const clientHeight = mapNodeRef.current.clientHeight || 480;

      const snapshotInput = {
        centerLat: center?.lat() ?? located.lat,
        centerLng: center?.lng() ?? located.lng,
        zoom: currentZoom,
        viewportWidth: clientWidth,
        viewportHeight: clientHeight,
        mobileLayerDefaults: isMobileTouchViewport(),
      };

      const layeredSnapshot = await createLayeredMapSnapshot(snapshotInput, apiKey);
      const croppedSnapshot = await cropMapSnapshotAttribution(layeredSnapshot);

      onConfirm({
        lat: center?.lat() ?? located.lat,
        lng: center?.lng() ?? located.lng,
        address: located.formattedAddress,
        snapshot: croppedSnapshot,
      });
    } catch (err) {
      console.error(err);
      setSnapshotError("Could not capture map snapshot. Ensure Static Maps API is enabled.");
    } finally {
      setCapturingSnapshot(false);
    }
  }

  const showLandingCard = !located;

  return (
    <div className="relative w-full h-full flex flex-col bg-brand-bg select-none">
      {/* Map Node Container */}
      <div className="absolute inset-0 z-0">
        {!googleMaps.ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-bg z-10">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-border/40 via-brand-card to-brand-bg" />
            <div className="relative flex items-center gap-2 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading property map...</span>
            </div>
          </div>
        )}
        <div ref={mapNodeRef} className="h-full w-full" aria-label="Property satellite map" />
      </div>

      {/* Stage 1 - Landing Overlay Card */}
      {showLandingCard && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/25 z-10">
          <div className="w-full max-w-lg bg-brand-card border border-brand-border/70 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
            <div className="flex flex-col items-center text-center">
              {/* AF Stub Logo */}
              <div className="flex items-center justify-center w-14 h-14 bg-brand-primary rounded-2xl text-white font-black text-xl mb-4 shadow-md">
                AF
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-text mb-2">
                Amazing Fencing
              </h2>
              <p className="text-sm font-bold text-brand-muted mb-6">
                Get an accurate fence quote in under 2 minutes.
              </p>
            </div>

            <AddressInput onLocated={setLocated} />

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-primary transition-colors focus:outline-none"
              >
                <span>Skip the map · draw on a blank canvas instead</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 - Live Map Controls and Overlays */}
      {!showLandingCard && (
        <>
          {/* Pulsing Tag */}
          <div className="absolute top-[14px] right-[14px] z-10 flex items-center gap-2 bg-brand-card/90 border border-brand-border/60 rounded-full px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-brand-text">Live Google Maps</span>
          </div>

          {/* Address Bar */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4">
            <div className="bg-brand-card border border-brand-border/60 rounded-xl p-2.5 shadow-lg flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur text-brand-text">
              <div className="flex items-center gap-2 truncate">
                <span className="text-brand-success font-bold text-sm shrink-0">✓</span>
                <span className="truncate" title={located.formattedAddress}>
                  {located.formattedAddress}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLocated(null)}
                className="text-brand-primary hover:text-brand-primary/80 shrink-0 font-bold"
              >
                Change
              </button>
            </div>
          </div>

          {/* Use This View CTA */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xs px-4">
            <button
              type="button"
              onClick={() => void handleUseView()}
              disabled={capturingSnapshot}
              className="w-full flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-brand-primary py-3 text-white font-bold transition-colors hover:bg-brand-primary/90 shadow-xl disabled:cursor-wait disabled:opacity-75 focus:outline-none"
            >
              <div className="flex items-center gap-2 text-sm">
                {capturingSnapshot ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-lg">⤓</span>
                )}
                <span>{capturingSnapshot ? "Capturing..." : "Use this view"}</span>
              </div>
              <span className="text-[10px] opacity-75 font-normal">
                locks this view into your canvas
              </span>
            </button>
          </div>

          {/* Error Message */}
          {snapshotError && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4">
              <p className="rounded-lg border border-brand-danger/30 bg-brand-danger/95 px-3 py-2 text-center text-xs font-bold text-white shadow-md">
                {snapshotError}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
