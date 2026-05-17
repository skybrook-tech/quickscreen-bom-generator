import { useState, useEffect, useRef, useCallback } from "react";
import { Info, Map, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { RefObject, KeyboardEvent } from "react";
import type { initCanvasEngine } from "./canvasEngine";

type Engine = ReturnType<typeof initCanvasEngine>;
export type MapType = "satellite" | "roadmap" | "terrain" | "hybrid";

export interface MapUiState {
  mapType: MapType;
  hasAddress: boolean;
  hasLoadedMap: boolean;
  calibrationLabel: string;
}

interface GooglePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GooglePlaceDetails {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
}

interface MapControlsProps {
  engineRef: RefObject<Engine | null>;
  onMapUiStateChange?: (state: MapUiState) => void;
}

declare global {
  interface Window {
    __quickScreenGoogleMapsPromise?: Promise<void>;
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: Record<string, unknown>,
              callback: (
                predictions: GooglePrediction[] | null,
                status: string,
              ) => void,
            ) => void;
          };
          PlacesService: new (attributionContainer: HTMLDivElement) => {
            getDetails: (
              request: Record<string, unknown>,
              callback: (
                place: GooglePlaceDetails | null,
                status: string,
              ) => void,
            ) => void;
          };
          PlacesServiceStatus: { OK: string };
        };
      };
    };
  }
}

const TILE_ZOOM = 20;
const STATIC_MAP_SIZE = "640x400";

function googleMapsKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "";
}

function metersPerPixelAt(latitude: number, zoom: number) {
  return (
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) /
    Math.pow(2, zoom)
  );
}

function loadGooglePlaces(key: string) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__quickScreenGoogleMapsPromise) {
    return window.__quickScreenGoogleMapsPromise;
  }

  window.__quickScreenGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key,
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return window.__quickScreenGoogleMapsPromise;
}

function predictionLines(prediction: GooglePrediction) {
  return {
    line1:
      prediction.structured_formatting?.main_text ?? prediction.description,
    line2: prediction.structured_formatting?.secondary_text ?? "",
  };
}

export function MapControls({
  engineRef,
  onMapUiStateChange,
}: MapControlsProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [scaleInput, setScaleInput] = useState("100");
  const [mapType, setMapType] = useState<MapType>("satellite");
  const [error, setError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [calibrationLabel, setCalibrationLabel] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<GooglePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetchingAutocomplete, setFetchingAutocomplete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesAttributionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMapUiStateChange?.({
      mapType,
      hasAddress: address.trim().length > 0,
      hasLoadedMap: mapLoaded,
      calibrationLabel,
    });
  }, [address, calibrationLabel, mapLoaded, mapType, onMapUiStateChange]);

  const fetchSuggestions = useCallback(async (query: string) => {
    const key = googleMapsKey();
    if (!key || query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setFetchingAutocomplete(true);
    try {
      await loadGooglePlaces(key);
      const service = new window.google!.maps!.places!.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "au" },
          types: ["address"],
        },
        (predictions, status) => {
          const ok = window.google?.maps?.places?.PlacesServiceStatus.OK;
          if (status !== ok || !predictions?.length) {
            setSuggestions([]);
            setShowDropdown(false);
            setActiveIndex(-1);
            return;
          }
          setSuggestions(predictions);
          setShowDropdown(true);
          setActiveIndex(-1);
        },
      );
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setFetchingAutocomplete(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setMapLoaded(false);
    setCalibrationLabel("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 250);
  };

  const loadMapAtLocation = useCallback(
    (lat: number, lng: number, label: string, overrideMapType?: MapType) => {
      const key = googleMapsKey();
      const activeMapType = overrideMapType ?? mapType;
      const metersPerPixel = metersPerPixelAt(lat, TILE_ZOOM);
      const autoScale = 1 / metersPerPixel;
      const scaleLabel = `${autoScale.toFixed(1)} px/m · zoom ${TILE_ZOOM}`;
      const staticUrl =
        `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}` +
        `&zoom=${TILE_ZOOM}&size=${STATIC_MAP_SIZE}&maptype=${activeMapType}` +
        `&key=${encodeURIComponent(key)}`;

      engineRef.current?.setScale(autoScale);
      setScaleInput(autoScale.toFixed(1));
      setCalibrationLabel(scaleLabel);
      engineRef.current?.loadMapTile(staticUrl, opacity, lat, TILE_ZOOM);
      setMapLoaded(true);
      toast.success(`Auto-calibrated to ${autoScale.toFixed(1)} px/m`, {
        description: label,
      });
    },
    [engineRef, mapType, opacity],
  );

  const loadAddressViaGeocode = useCallback(
    async (addr: string, overrideMapType?: MapType) => {
      const key = googleMapsKey();
      if (!key) {
        setError(
          "Google Maps API key not configured. Set VITE_GOOGLE_MAPS_KEY in .env.local.",
        );
        return;
      }
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        addr,
      )}&key=${encodeURIComponent(key)}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      if (data.status !== "OK" || !data.results?.[0]) {
        throw new Error("Address not found.");
      }
      const loc = data.results[0].geometry.location;
      loadMapAtLocation(
        loc.lat,
        loc.lng,
        data.results[0].formatted_address ?? addr,
        overrideMapType,
      );
    },
    [loadMapAtLocation],
  );

  const selectSuggestion = async (
    prediction: GooglePrediction,
    overrideMapType?: MapType,
  ) => {
    const key = googleMapsKey();
    if (!key) return;
    setError("");
    setLoading(true);
    try {
      await loadGooglePlaces(key);
      const attribution =
        placesAttributionRef.current ?? document.createElement("div");
      const service = new window.google!.maps!.places!.PlacesService(
        attribution,
      );
      service.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["formatted_address", "geometry"],
        },
        (place, status) => {
          const ok = window.google?.maps?.places?.PlacesServiceStatus.OK;
          if (status !== ok || !place?.geometry?.location) {
            setError("Address not found.");
            setLoading(false);
            return;
          }
          const label = place.formatted_address ?? prediction.description;
          setAddress(label);
          setSuggestions([]);
          setShowDropdown(false);
          setActiveIndex(-1);
          loadMapAtLocation(
            place.geometry.location.lat(),
            place.geometry.location.lng(),
            label,
            overrideMapType,
          );
          setLoading(false);
        },
      );
    } catch {
      setError("Failed to load Google Places autocomplete.");
      setLoading(false);
    }
  };

  const handleLoadMap = async (overrideMapType?: MapType) => {
    if (!address.trim()) return;
    setError("");
    setLoading(true);
    try {
      await loadAddressViaGeocode(address, overrideMapType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load map tile.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "Enter") void handleLoadMap();
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
        void selectSuggestion(suggestions[activeIndex]);
      } else {
        setShowDropdown(false);
        void handleLoadMap();
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

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

  useEffect(() => {
    if (mapLoaded && address.trim()) {
      void handleLoadMap(mapType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType]);

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    engineRef.current?.setMapOpacity(value);
  };

  const handleScaleBlur = () => {
    const val = parseFloat(scaleInput);
    if (!Number.isNaN(val) && val > 0) {
      engineRef.current?.setScale(val);
      setCalibrationLabel(`Manual: ${val.toFixed(1)} px/m`);
    }
  };

  return (
    <div className="relative border-b border-brand-border bg-brand-card p-3 text-xs">
      <div ref={placesAttributionRef} className="hidden" />
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
          <Map size={16} className="text-brand-muted shrink-0" />
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
              placeholder="Enter address for satellite underlay..."
              className="w-full px-2 py-1.5 bg-brand-bg border border-brand-border rounded-md text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent text-xs"
              autoComplete="off"
            />
            {fetchingAutocomplete && (
              <Loader2
                size={16}
                className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-brand-muted pointer-events-none"
              />
            )}
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-brand-card border border-brand-border rounded-md shadow-lg overflow-hidden"
              >
                {suggestions.map((prediction, idx) => {
                  const { line1, line2 } = predictionLines(prediction);
                  return (
                    <button
                      key={prediction.place_id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        void selectSuggestion(prediction);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        idx === activeIndex
                          ? "bg-brand-accent/20"
                          : "hover:bg-brand-border/50"
                      }`}
                    >
                      <div
                        className={`text-xs truncate ${
                          idx === activeIndex
                            ? "text-brand-accent"
                            : "text-brand-text"
                        }`}
                      >
                        {line1}
                      </div>
                      {line2 && (
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
            onClick={() => void handleLoadMap()}
            disabled={loading || !address.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-accent/20 border border-brand-accent text-brand-accent rounded-md hover:bg-brand-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Map size={16} />
            )}
            Load
          </button>
        </div>
          {calibrationLabel && (
            <span className="rounded-full border border-brand-success/40 bg-brand-success/10 px-2 py-1 text-brand-success">
              Calibrated: {calibrationLabel}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
          aria-expanded={settingsOpen}
          title="Map settings"
        >
          <Settings2 size={16} />
          Map
        </button>
      </div>

      {settingsOpen && (
        <div className="absolute right-3 top-[calc(100%-0.25rem)] z-40 w-72 rounded-xl border border-brand-border bg-brand-card p-3 text-xs shadow-xl">
          <label className="block">
            <span className="text-xs font-bold text-brand-muted">Map type</span>
            <select
              value={mapType}
              onChange={(e) => setMapType(e.target.value as MapType)}
              className="mt-1 w-full rounded border border-brand-border bg-brand-bg px-2 py-1.5 text-xs text-brand-text"
            >
              <option value="satellite">Satellite</option>
              <option value="roadmap">Roadmap</option>
              <option value="terrain">Terrain</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-bold text-brand-muted">
              Opacity: {Math.round(opacity * 100)}%
            </span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="mt-1 w-full accent-brand-accent"
            />
          </label>

          <label className="mt-3 block">
            <span className="flex items-center gap-1 text-xs font-bold text-brand-muted">
              Scale
              <Info
                size={14}
                className="text-brand-muted"
                aria-label="Scale help"
              />
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={scaleInput}
                onChange={(e) => setScaleInput(e.target.value)}
                onBlur={handleScaleBlur}
                className="w-24 rounded border border-brand-border bg-brand-bg px-2 py-1.5 text-xs text-brand-text"
                title="px per metre - the canvas distance for 1m of real fence. Auto-calibrates when you load a satellite address."
                min="0.01"
                step="any"
              />
              <span className="text-brand-muted">px/m</span>
            </div>
          </label>
        </div>
      )}

      {!googleMapsKey() && (
        <p className="mt-2 text-brand-warning text-xs">
          Google Maps is ready, but `VITE_GOOGLE_MAPS_KEY` is not configured.
        </p>
      )}
      {error && <p className="mt-1 text-brand-danger text-xs">{error}</p>}
    </div>
  );
}
