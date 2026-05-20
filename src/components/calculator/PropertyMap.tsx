/// <reference types="google.maps" />

import { CheckCircle2, Layers, Loader2, MapPin } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { AddressInput, type LocatedAddress } from "./AddressInput";

type MapType = "satellite" | "hybrid";

export interface PropertyAnchor {
  anchorLat: number;
  anchorLng: number;
  formattedAddress: string;
}

interface PropertyMapProps {
  initialAnchor?: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  onAnchorConfirmed: (anchor: PropertyAnchor) => void;
}

interface PropertyAnchorFormGateProps {
  anchorConfirmed: boolean;
  children: ReactNode;
}

const DEFAULT_CENTER = { lat: -25, lng: 133 };
const DEFAULT_ZOOM = 4;
const PROPERTY_ZOOM = 20;

export function PropertyAnchorFormGate({ anchorConfirmed, children }: PropertyAnchorFormGateProps) {
  return (
    <>
      {!anchorConfirmed ? (
        <div className="rounded-xl border border-brand-warning/35 bg-brand-warning/10 px-3 py-2 text-sm font-bold text-brand-warning">
          Confirm property location to start drawing
        </div>
      ) : null}
      <div inert={!anchorConfirmed} className={!anchorConfirmed ? "opacity-50" : ""}>
        {children}
      </div>
    </>
  );
}

export function PropertyMap({ initialAnchor, onAnchorConfirmed }: PropertyMapProps) {
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
  }, [initialAnchor]);

  function handleConfirmFromExpanded() {
    if (!pin || !located) return;
    setConfirmed(true);
    setEditing(false);
    onAnchorConfirmed({
      anchorLat: pin.lat,
      anchorLng: pin.lng,
      formattedAddress: located.formattedAddress,
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
              Confirmed property
            </p>
            <p className="truncate text-sm font-bold text-brand-text">
              {located.formattedAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <MapPin size={15} />
            Change property
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
      onLocated={(location) => {
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
  onLocated: (location: LocatedAddress) => void;
  onPinChange: (pin: { lat: number; lng: number }) => void;
  onConfirm: () => void;
}

function ExpandedPropertyMap({
  located,
  pin,
  confirmed,
  onLocated,
  onPinChange,
  onConfirm,
}: ExpandedPropertyMapProps) {
  const googleMaps = useGoogleMaps();
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapType, setMapType] = useState<MapType>("satellite");

  useEffect(() => {
    if (!googleMaps.ready || !mapNodeRef.current || mapRef.current) return;
    const center = pin ?? DEFAULT_CENTER;
    mapRef.current = new google.maps.Map(mapNodeRef.current, {
      center,
      zoom: pin ? PROPERTY_ZOOM : DEFAULT_ZOOM,
      mapTypeId: mapType,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      rotateControl: false,
      tilt: 0,
    });
  }, [googleMaps.ready, mapType, pin]);

  useEffect(() => {
    mapRef.current?.setMapTypeId(mapType);
  }, [mapType]);

  useEffect(() => {
    if (!googleMaps.ready || !mapRef.current || !pin) return;
    const position = new google.maps.LatLng(pin.lat, pin.lng);
    mapRef.current.panTo(position);
    mapRef.current.setZoom(PROPERTY_ZOOM);

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

  const mapStatus = googleMaps.error
    ? googleMaps.error.message
    : googleMaps.loading
      ? "Loading satellite map..."
      : "Search for the property, then drag the pin if the roofline needs fine tuning.";

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
        <button
          type="button"
          onClick={() => setMapType((value) => (value === "satellite" ? "hybrid" : "satellite"))}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
          title={mapType === "satellite" ? "Show street labels" : "Hide street labels"}
        >
          <Layers size={15} />
          {mapType === "satellite" ? "Hybrid" : "Satellite"}
        </button>
      </div>

      <AddressInput onLocated={onLocated} />

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

      {pin && located ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-bg/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-bold text-brand-text">{located.formattedAddress}</p>
            <p className="mt-1 text-xs font-semibold text-brand-muted">
              Pin: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90"
          >
            {confirmed ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
            {confirmed ? "Location confirmed" : "Confirm property location"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
