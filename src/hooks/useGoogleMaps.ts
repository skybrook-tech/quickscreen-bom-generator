import { useEffect, useState } from "react";
import { getGoogleMapsLoader } from "../lib/googleMaps/loader";

export type GoogleMapsState = {
  loading: boolean;
  ready: boolean;
  error: Error | null;
};

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export function useGoogleMaps(): GoogleMapsState {
  const [state, setState] = useState<GoogleMapsState>({
    loading: true,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    setState({ loading: true, ready: false, error: null });

    try {
      getGoogleMapsLoader()
        .load()
        .then(() => {
          if (!cancelled) setState({ loading: false, ready: true, error: null });
        })
        .catch((error: unknown) => {
          if (!cancelled) setState({ loading: false, ready: false, error: toError(error) });
        });
    } catch (error) {
      setState({ loading: false, ready: false, error: toError(error) });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
