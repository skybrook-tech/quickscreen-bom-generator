import { useState } from "react";
import { Map, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;

interface MapControlsProps {
  engineRef: RefObject<Engine | null>;
}

// Scale presets: pixels per metre
const SCALE_PRESETS = [
  { label: "1px = 10cm (zoom in)", value: 10 },
  { label: "1px = 50cm", value: 2 },
  { label: "1px = 1m (default)", value: 1 },
  { label: "1px = 2m", value: 0.5 },
  { label: "1px = 5m", value: 0.2 },
];

export function MapControls({ engineRef }: MapControlsProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [scalePreset, setScalePreset] = useState(1); // px per metre
  const [error, setError] = useState("");

  const handleLoadMap = async () => {
    if (!address.trim()) return;
    setError("");
    setLoading(true);
    try {
      // Use the Google Static Maps API (key loaded from window.GOOGLE_MAPS_KEY or env)
      // Falls back to a placeholder message if no key is available.
      const key =
        (window as unknown as Record<string, string>)["GOOGLE_MAPS_KEY"] ?? "";
      if (!key) {
        setError(
          "Google Maps API key not configured. Set window.GOOGLE_MAPS_KEY or add a script tag.",
        );
        setLoading(false);
        return;
      }

      // Use Geocoding API to get lat/lng, then Static Maps for the tile
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
      const geoResp = await fetch(geocodeUrl);
      const geoData = await geoResp.json();
      if (geoData.status !== "OK" || !geoData.results?.[0]) {
        setError("Address not found.");
        setLoading(false);
        return;
      }

      const loc = geoData.results[0].geometry.location;
      const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=20&size=640x400&maptype=satellite&key=${key}`;
      engineRef.current?.loadMapTile(staticUrl, opacity);
    } catch {
      setError("Failed to load map tile.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpacityChange = (v: number) => {
    setOpacity(v);
    engineRef.current?.setMapOpacity(v);
  };

  const handleScaleChange = (pxPerMetre: number) => {
    setScalePreset(pxPerMetre);
    engineRef.current?.setScale(pxPerMetre * 100); // convert to px per metre at base zoom
  };

  return (
    <div className="flex flex-wrap items-start gap-4 p-3 bg-brand-card border-b border-t border-brand-border text-xs">
      {/* Address search */}
      <div className="flex items-center gap-2 flex-1 min-w-[260px]">
        <Map size={13} className="text-brand-muted shrink-0" />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoadMap()}
          placeholder="Enter address for satellite underlay…"
          className="flex-1 px-2 py-1.5 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent text-xs"
        />
        <button
          type="button"
          onClick={handleLoadMap}
          disabled={loading || !address.trim()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-accent/20 border border-brand-accent text-brand-accent rounded-md hover:bg-brand-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Map size={12} />
          )}
          Load
        </button>
      </div>

      {/* Opacity slider */}
      <div className="flex items-center gap-2">
        <span className="text-brand-muted">Opacity:</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          className="w-20 accent-brand-accent"
        />
        <span className="text-brand-muted w-8">
          {Math.round(opacity * 100)}%
        </span>
      </div>

      {/* Scale */}
      <div className="flex items-center gap-2">
        <span className="text-brand-muted">Scale:</span>
        <select
          value={scalePreset}
          onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
          className="px-2 py-1.5 bg-brand-bg border border-brand-border rounded-md text-brand-text focus:outline-none focus:border-brand-accent text-xs"
        >
          {SCALE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="w-full text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
