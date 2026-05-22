import { Loader, type Libraries } from "@googlemaps/js-api-loader";

export const GOOGLE_MAPS_MISSING_API_KEY_MESSAGE =
  "VITE_GOOGLE_MAPS_API_KEY not set — see README section 'Google Maps API key'";

const GOOGLE_MAPS_LIBRARIES: Libraries = ["geometry", "places"];

let googleMapsLoader: Loader | null = null;

function readGoogleMapsApiKey() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(GOOGLE_MAPS_MISSING_API_KEY_MESSAGE);
  }
  return apiKey;
}

export function getGoogleMapsLoader() {
  if (!googleMapsLoader) {
    googleMapsLoader = new Loader({
      apiKey: readGoogleMapsApiKey(),
      libraries: GOOGLE_MAPS_LIBRARIES,
      version: "weekly",
    });
  }

  return googleMapsLoader;
}

export function resetGoogleMapsLoaderForTests() {
  if (import.meta.env.MODE === "test") {
    googleMapsLoader = null;
  }
}
