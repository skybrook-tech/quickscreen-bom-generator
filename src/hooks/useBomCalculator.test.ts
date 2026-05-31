import { describe, expect, it } from "vitest";
import { isEdgeFailurePayload } from "./useBomCalculator";

describe("isEdgeFailurePayload", () => {
  it("detects top-level edge error responses", () => {
    expect(isEdgeFailurePayload({ error: "User profile not found" })).toBe(true);
  });

  it("does not treat validation errors as edge failures", () => {
    expect(isEdgeFailurePayload({ errors: ["Opening is too wide"], lines: [] })).toBe(false);
  });
});
