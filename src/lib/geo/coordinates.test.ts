import { describe, expect, it } from "vitest";
import { latLngToMetres, metresToLatLng, type LatLngLiteral } from "./coordinates";

const anchors: LatLngLiteral[] = [
  { lat: -16.9186, lng: 145.7781 }, // Cairns
  { lat: -27.4698, lng: 153.0251 }, // Brisbane
  { lat: -33.8688, lng: 151.2093 }, // Sydney
  { lat: -37.8136, lng: 144.9631 }, // Melbourne
  { lat: -42.8821, lng: 147.3272 }, // Hobart
];

const offsets = [
  { dxMetres: 0, dyMetres: 0 },
  { dxMetres: 10, dyMetres: 0 },
  { dxMetres: 0, dyMetres: 10 },
  { dxMetres: -37.25, dyMetres: 128.75 },
  { dxMetres: 499.999, dyMetres: -499.999 },
];

describe("geo coordinates", () => {
  it("round-trips property-scale metre offsets with sub-millimetre accuracy", () => {
    for (const anchor of anchors) {
      for (const offset of offsets) {
        const latLng = metresToLatLng(anchor, offset.dxMetres, offset.dyMetres);
        const actual = latLngToMetres(anchor, latLng);

        expect(Math.abs(actual.dxMetres - offset.dxMetres)).toBeLessThan(0.001);
        expect(Math.abs(actual.dyMetres - offset.dyMetres)).toBeLessThan(0.001);
      }
    }
  });
});
