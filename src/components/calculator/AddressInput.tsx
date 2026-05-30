/// <reference types="google.maps" />

import { Loader2, MapPin, Mic, Search } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { getGoogleMapsLoader } from "../../lib/googleMaps/loader";

export interface LocatedAddress {
  address: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface AddressInputProps {
  onLocated: (location: LocatedAddress) => void;
  onEngaged?: () => void;
}

interface AddressSuggestion {
  id: string;
  description: string;
  secondaryText?: string;
}

type GeocodeResult = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

type GeocodeResponse = {
  status?: string;
  error_message?: string;
  results?: GeocodeResult[];
};

type SpeechRecognitionResultLike = {
  [index: number]: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  results?: {
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
};

type SpeechRecognitionErrorLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function readApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

function readSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function geocodeErrorMessage(response: GeocodeResponse) {
  if (response.status === "ZERO_RESULTS") return "No Australian property found for that address.";
  if ((response.results?.length ?? 0) > 1) return "That address is ambiguous. Add suburb, state, or postcode.";
  return response.error_message || "Google could not geocode that address.";
}

const AUSTRALIA_BOUNDS = {
  west: 112.9,
  north: -10,
  east: 153.7,
  south: -44,
};

export const PLACES_API_ENABLEMENT_MESSAGE =
  "Places API is not enabled on the Google Cloud key. Enable it at https://console.cloud.google.com/apis/library/places-backend.googleapis.com to use address autocomplete. Manual address entry still works via the Find property button.";

function placeText(text: google.maps.places.FormattableText | null | undefined) {
  return text?.text ?? text?.toString() ?? "";
}

export function AddressInput({ onLocated, onEngaged }: AddressInputProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [placesUnavailable, setPlacesUnavailable] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(() => Boolean(readSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocompleteRequestId = useRef(0);
  const justSelectedValueRef = useRef("");
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  async function geocodeAddress(rawAddress: string) {
    const trimmed = rawAddress.trim();
    if (!trimmed) {
      setError("Enter an Australian property address.");
      return;
    }

    const apiKey = readApiKey();
    if (!apiKey) {
      setError("VITE_GOOGLE_MAPS_API_KEY is not set.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        address: trimmed,
        key: apiKey,
        region: "au",
        components: "country:au",
      });
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      if (!response.ok) {
        throw new Error(`Geocoding request failed (${response.status})`);
      }

      const body = (await response.json()) as GeocodeResponse;
      const results = body.results ?? [];
      if (body.status !== "OK" || results.length !== 1) {
        setError(geocodeErrorMessage({ ...body, results }));
        return;
      }

      const result = results[0];
      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") {
        setError("Google returned an address without map coordinates.");
        return;
      }

      onLocated({
        address: trimmed,
        lat,
        lng,
        formattedAddress: result.formatted_address || trimmed,
      });
      setSuggestions([]);
      setSuggestionsOpen(false);
      sessionTokenRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocoding failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onEngaged?.();
    await geocodeAddress(address);
  }

  function handleAddressChange(nextAddress: string) {
    setJustSelected(false);
    justSelectedValueRef.current = "";
    setAddress(nextAddress);
    setError(null);
    if (nextAddress.trim()) {
      onEngaged?.();
      setSuggestionsOpen(true);
    } else {
      setSuggestions([]);
      setSuggestionsOpen(false);
      sessionTokenRef.current = null;
    }
  }

  async function handleSuggestionSelect(suggestion: AddressSuggestion) {
    justSelectedValueRef.current = suggestion.description.trim();
    setJustSelected(true);
    setAddress(suggestion.description);
    setSuggestions([]);
    setSuggestionsOpen(false);
    inputRef.current?.blur();
    onEngaged?.();
    await geocodeAddress(suggestion.description);
  }

  function handleVoiceInput() {
    const SpeechRecognition = readSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-AU";
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setAddress(transcript);
      setError(null);
      setSuggestions([]);
      setSuggestionsOpen(false);
      onEngaged?.();
      void geocodeAddress(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechSupported(false);
      }
    };
    recognition.onend = () => {
      setListening(false);
      speechRecognitionRef.current = null;
    };

    try {
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setSpeechSupported(false);
      speechRecognitionRef.current = null;
    }
  }

  useEffect(() => {
    const trimmed = address.trim();
    if (justSelected && justSelectedValueRef.current === trimmed) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setJustSelected(false);
      return;
    }
    if (justSelectedValueRef.current === trimmed) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      return;
    }
    if (placesUnavailable || trimmed.length < 3) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    const requestId = autocompleteRequestId.current + 1;
    autocompleteRequestId.current = requestId;
    const timer = window.setTimeout(() => {
      setSuggestionsLoading(true);
      Promise.resolve()
        .then(() => getGoogleMapsLoader().load())
        .then(async () => {
          const placesLibrary = (await google.maps.importLibrary(
            "places",
          )) as google.maps.PlacesLibrary;
          const AutocompleteSuggestion = placesLibrary.AutocompleteSuggestion;
          const AutocompleteSessionToken = placesLibrary.AutocompleteSessionToken;
          if (!AutocompleteSuggestion || !AutocompleteSessionToken) {
            throw new Error("Places API (New) autocomplete classes are unavailable.");
          }
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new AutocompleteSessionToken();
          }

          const request: google.maps.places.AutocompleteRequest = {
            input: trimmed,
            region: "AU",
            includedRegionCodes: ["au"],
            locationRestriction: AUSTRALIA_BOUNDS,
            sessionToken: sessionTokenRef.current,
          };
          const { suggestions: nextSuggestions } =
            await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          if (cancelled || autocompleteRequestId.current !== requestId) return;
          const parsedSuggestions: AddressSuggestion[] = [];
          for (const suggestion of nextSuggestions) {
            const prediction = suggestion.placePrediction;
            const description = placeText(prediction?.text);
            if (!prediction || !description) continue;
            const secondaryText = placeText(prediction.secondaryText);
            parsedSuggestions.push({
              id: prediction.placeId,
              description,
              ...(secondaryText ? { secondaryText } : {}),
            });
          }
          console.info(
            `[Autocomplete] Places API returned ${parsedSuggestions.length} suggestions for query: ${trimmed}`,
          );
          setSuggestions(parsedSuggestions.slice(0, 5));
          setSuggestionsOpen(true);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          console.error(PLACES_API_ENABLEMENT_MESSAGE, err);
          setPlacesUnavailable(true);
          setSuggestions([]);
          setSuggestionsOpen(false);
        })
        .finally(() => {
          if (!cancelled) setSuggestionsLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, justSelected, placesUnavailable]);

  useEffect(
    () => () => {
      speechRecognitionRef.current?.stop();
    },
    [],
  );

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <label className="block text-xs font-black uppercase tracking-[0.14em] text-brand-muted">
        Property address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <MapPin
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted"
          />
          <input
            ref={inputRef}
            value={address}
            onChange={(event) => handleAddressChange(event.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestionsOpen(true);
            }}
            onBlur={() => {
              setSuggestions([]);
              setSuggestionsOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSuggestions([]);
                setSuggestionsOpen(false);
              }
            }}
            placeholder="Start with an Australian street address"
            className="w-full rounded-lg border border-brand-border bg-brand-bg py-3 pl-9 pr-12 text-sm font-semibold text-brand-text outline-none transition-colors placeholder:text-brand-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          {speechSupported ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleVoiceInput}
              className={`absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-border/50 hover:text-brand-primary ${listening ? "animate-pulse text-brand-primary" : ""}`}
              aria-label={listening ? "Listening for address" : "Speak property address"}
              title={listening ? "Listening" : "Speak property address"}
            >
              {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic size={17} />}
            </button>
          ) : null}
          {suggestionsOpen && (suggestions.length > 0 || suggestionsLoading) ? (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-brand-border bg-brand-card shadow-xl">
              {suggestionsLoading && suggestions.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-brand-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Finding Australian addresses
                </div>
              ) : null}
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleSuggestionSelect(suggestion)}
                  className="block min-h-11 w-full border-t border-brand-border/60 px-3 py-2 text-left text-sm transition-colors first:border-t-0 hover:bg-brand-bg focus:bg-brand-bg focus:outline-none"
                >
                  <span className="block font-bold text-brand-text">
                    {suggestion.description}
                  </span>
                  {suggestion.secondaryText ? (
                    <span className="block truncate text-xs font-semibold text-brand-muted">
                      {suggestion.secondaryText}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={16} />}
          Find property
        </button>
      </div>
      {error ? (
        <p className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-3 py-2 text-xs font-bold text-brand-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
