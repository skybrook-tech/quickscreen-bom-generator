import { Loader2, MapPin, Search } from "lucide-react";
import { type FormEvent, useState } from "react";

export interface LocatedAddress {
  address: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface AddressInputProps {
  onLocated: (location: LocatedAddress) => void;
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

function readApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

function geocodeErrorMessage(response: GeocodeResponse) {
  if (response.status === "ZERO_RESULTS") return "No Australian property found for that address.";
  if ((response.results?.length ?? 0) > 1) return "That address is ambiguous. Add suburb, state, or postcode.";
  return response.error_message || "Google could not geocode that address.";
}

export function AddressInput({ onLocated }: AddressInputProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = address.trim();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geocoding failed.");
    } finally {
      setLoading(false);
    }
  }

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
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Start with an Australian street address"
            className="w-full rounded-lg border border-brand-border bg-brand-bg py-2 pl-9 pr-3 text-sm font-semibold text-brand-text outline-none transition-colors placeholder:text-brand-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
