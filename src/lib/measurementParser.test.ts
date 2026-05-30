import { describe, expect, it } from "vitest";
import { parseMeasurementToMetres, parseMeasurementToMm } from "./measurementParser";
import { parseDescription } from "./describeFenceParser";

describe("measurementParser", () => {
  it.each([
    ["six meters", 6],
    ["6 meters", 6],
    ["6m", 6],
    ["6.0m", 6],
    ["six metres", 6],
    ["six and a half meters", 6.5],
    ["6 and a half meters", 6.5],
    ["six point five", 6.5],
    ["6.5m", 6.5],
    ["six fifty", 6.5],
    ["6m 50", 6.5],
    ["about six meters", 6],
    ["roughly 6m", 6],
    ["around six", 6],
    ["6", 6],
    ["six", 6],
  ])("parses %s as %s metres", (input, expected) => {
    expect(parseMeasurementToMetres(input)).toBe(expected);
    expect(parseMeasurementToMm(input)).toBe(Math.round(expected * 1000));
  });

  it("returns null for unparseable phrases instead of silently defaulting to zero", () => {
    expect(parseMeasurementToMetres("banana")).toBeNull();
    expect(parseMeasurementToMm("banana")).toBeNull();
  });

  it("feeds fuzzy spoken run lengths into the description parser", () => {
    const result = parseDescription("about six meters of black slat fence");

    expect(result.attributes.runLengthMm?.value).toBe(6000);
    expect(result.attributes.runLengthMm?.confidence).toBe("stated");
  });
});
