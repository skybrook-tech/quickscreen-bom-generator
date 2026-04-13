import { useState, useEffect, useRef, useCallback } from "react";
import { Map, Loader2 } from "lucide-react";
import type { RefObject, KeyboardEvent } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;
type MapType = "satellite" | "roadmap" | "terrain" | "hybrid";

interface PhotonFeature {
  type: "Feature";
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

interface MapControlsProps {
  engineRef: RefObject<Engine | null>;
}

function formatSuggestion(f: PhotonFeature): { line1: string; line2: string } {
  const p = f.properties;
  let line1 = "";
  if (p.housenumber && p.street) {
    line1 = `${p.housenumber} ${p.street}`;
  } else if (p.street) {
    line1 = p.street;
  } else if (p.name) {
    line1 = p.name;
  }

  const line2Parts: string[] = [];
  if (p.city) line2Parts.push(p.city);
  if (p.state) line2Parts.push(p.state);
  if (p.postcode) line2Parts.push(p.postcode);
  if (p.country && p.country !== "Australia") line2Parts.push(p.country);

  return { line1, line2: line2Parts.join(", ") };
}

function suggestionText(f: PhotonFeature): string {
  const { line1, line2 } = formatSuggestion(f);
  return [line1, line2].filter(Boolean).join(", ");
}

export function MapControls({ engineRef }: MapControlsProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [scaleInput, setScaleInput] = useState("1"); // px per metre
  const [mapType, setMapType] = useState<MapType>("satellite");
  const [error, setError] = useState("");
  const mapLoadedRef = useRef(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetchingAC, setFetchingAC] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setFetchingAC(true);
    try {
      // Photon/OSM — Australian bounding box: west=112, south=-44, east=154, north=-10
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&bbox=112,-44,154,-10`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("autocomplete fetch failed");
      const data = await resp.json();
      const features: PhotonFeature[] = (data.features ?? []).filter(
        (f: PhotonFeature) =>
          f.geometry?.type === "Point" &&
          (f.properties?.country === "Australia" ||
            f.properties?.country === "AU"),
      );
      setSuggestions(features);
      setShowDropdown(features.length > 0);
      setActiveIndex(-1);
    } catch {
      // Silently fail — user can still type and press Enter/Load
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setFetchingAC(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 300);
  };

  const selectSuggestion = (feature: PhotonFeature) => {
    const text = suggestionText(feature);
    setAddress(text);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
    // Trigger map load with the selected address
    void handleLoadMapWithAddress(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "Enter") handleLoadMap();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectSuggestion(suggestions[activeIndex]);
      } else {
        setShowDropdown(false);
        handleLoadMap();
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLoadMapWithAddress = async (
    addr: string,
    overrideMapType?: MapType,
  ) => {
    if (!addr.trim()) return;
    setError("");
    setLoading(true);
    try {
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "";
      if (!key) {
        setError(
          "Google Maps API key not configured. Set VITE_GOOGLE_MAPS_KEY in .env.local.",
        );
        setLoading(false);
        return;
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`;
      const geoResp = await fetch(geocodeUrl);
      const geoData = await geoResp.json();
      if (geoData.status !== "OK" || !geoData.results?.[0]) {
        setError("Address not found.");
        setLoading(false);
        return;
      }

      const loc = geoData.results[0].geometry.location;
      const activeMapType = overrideMapType ?? mapType;
      const TILE_ZOOM = 20;
      const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=${TILE_ZOOM}&size=640x400&maptype=${activeMapType}&key=${key}`;
      engineRef.current?.loadMapTile(staticUrl, opacity, loc.lat, TILE_ZOOM);
      mapLoadedRef.current = true;
    } catch {
      setError("Failed to load map tile.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMap = async (overrideMapType?: MapType) => {
    await handleLoadMapWithAddress(address, overrideMapType);
  };

  // Auto-reload the map when the map type changes (if a map is already loaded)
  useEffect(() => {
    if (mapLoadedRef.current) {
      void handleLoadMap(mapType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType]);

  const handleOpacityChange = (v: number) => {
    setOpacity(v);
    engineRef.current?.setMapOpacity(v);
  };

  const handleScaleBlur = () => {
    const val = parseFloat(scaleInput);
    if (!isNaN(val) && val > 0) {
      engineRef.current?.setScale(val * 100); // convert to px per metre at base zoom
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4 p-3 bg-brand-card border-b border-t border-brand-border text-xs">
      {/* Address search + map type */}
      <div className="flex flex-col gap-2 flex-1 min-w-[260px]">
        <div className="flex items-center gap-2">
          <Map size={13} className="text-brand-muted shrink-0" />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Enter address for satellite underlay…"
              className="w-full px-2 py-1.5 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent text-xs"
              autoComplete="off"
            />
            {fetchingAC && (
              <Loader2
                size={10}
                className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-brand-muted pointer-events-none"
              />
            )}
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-brand-card border border-brand-border rounded-md shadow-lg overflow-hidden"
              >
                {suggestions.map((feature, idx) => {
                  const { line1, line2 } = formatSuggestion(feature);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent input blur before click registers
                        e.preventDefault();
                        selectSuggestion(feature);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        idx === activeIndex
                          ? "bg-brand-accent/20"
                          : "hover:bg-brand-border/50"
                      }`}
                    >
                      <div className={`text-xs truncate ${idx === activeIndex ? "text-brand-accent" : "text-brand-text"}`}>
                        {line1 || line2}
                      </div>
                      {line1 && line2 && (
                        <div className="text-xs truncate text-brand-muted mt-0.5">
                          {line2}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleLoadMap()}
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">Map type</span>
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value as MapType)}
            className="text-xs bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
          >
            <option value="satellite">Satellite</option>
            <option value="roadmap">Roadmap</option>
            <option value="terrain">Terrain</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* Opacity slider */}
      <div className="flex items-center gap-2">
        <span className="text-brand-muted">Opacity:</span>
        <input
          type="range"
          min={0.1}
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
        <span className="text-xs text-brand-muted">Scale</span>
        <input
          type="number"
          value={scaleInput}
          onChange={(e) => setScaleInput(e.target.value)}
          onBlur={handleScaleBlur}
          className="w-20 text-xs bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
          title="Scale: px per metre"
          min="0.01"
          step="any"
        />
      </div>

      {error && <p className="w-full text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
