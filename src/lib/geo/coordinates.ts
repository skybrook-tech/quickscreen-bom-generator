export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface MetreOffset {
  dxMetres: number;
  dyMetres: number;
}

const EARTH_RADIUS_METRES = 6378137;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function anchorCosLat(anchor: LatLngLiteral) {
  const cosLat = Math.cos(anchor.lat * DEG_TO_RAD);
  return Math.abs(cosLat) < 1e-12 ? 1e-12 : cosLat;
}

export function metresToLatLng(
  anchor: LatLngLiteral,
  dxMetres: number,
  dyMetres: number,
): LatLngLiteral {
  return {
    lat: anchor.lat + (dyMetres / EARTH_RADIUS_METRES) * RAD_TO_DEG,
    lng:
      anchor.lng +
      (dxMetres / (EARTH_RADIUS_METRES * anchorCosLat(anchor))) * RAD_TO_DEG,
  };
}

export function latLngToMetres(
  anchor: LatLngLiteral,
  latLng: LatLngLiteral,
): MetreOffset {
  return {
    dxMetres:
      (latLng.lng - anchor.lng) *
      DEG_TO_RAD *
      EARTH_RADIUS_METRES *
      anchorCosLat(anchor),
    dyMetres: (latLng.lat - anchor.lat) * DEG_TO_RAD * EARTH_RADIUS_METRES,
  };
}
