import type { CanonicalPayload } from "../types/canonical.types";
import type { UiCalculatorConfig } from "../types/calculatorConfig.types";

/**
 * Builds a fresh CanonicalPayload for a new quote started with `productCode`:
 * one run + one panel segment, seeded from the target product's resolved
 * `normalisedVariables` (full cascade); `useRunReconciliation` finalises once
 * the run mounts. Carries over the base payload's property anchor / map snapshot
 * when present. Shared by the product catalogue landing and RunListV3.
 */
export function buildInitialFencePayload(
  productCode: string,
  config: UiCalculatorConfig | undefined,
  base?: CanonicalPayload | null,
): CanonicalPayload {
  const variables = { ...(config?.normalisedVariables ?? {}) };
  const isPanel = config?.strategy.fence === "panel";
  return {
    productCode,
    schemaVersion: "v1",
    // v3: runs carry the variables; payload.variables stays empty.
    variables: {},
    ...(base?.propertyAnchor ? { propertyAnchor: base.propertyAnchor } : {}),
    ...(base?.snapshot ? { snapshot: base.snapshot } : {}),
    runs: [
      {
        runId: crypto.randomUUID(),
        productCode,
        variables,
        leftBoundary: { type: "product_post" },
        rightBoundary: { type: "product_post" },
        segments: [
          {
            segmentId: crypto.randomUUID(),
            sortOrder: 1,
            segmentKind: "panel",
            segmentWidthMm: 0,
            targetHeightMm: 1800,
            variables: isPanel ? { panel_quantity: 1 } : undefined,
          },
        ],
        corners: [],
      },
    ],
  };
}
