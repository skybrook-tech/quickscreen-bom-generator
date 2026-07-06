/**
 * calculatorV3Helpers.ts — pure utilities for the v3 calculator.
 *
 * No React hooks, no side effects, no context access.
 * Everything here is safe to import in hooks, components, and tests.
 */

import { useState, useRef, useEffect } from "react";
import { GATE_SEGMENT_STUB_KEYS } from "./segmentTermination";
import {
  clearGateOpeningWidthMm,
  defaultGateBuildForMovementInfill,
  defaultGateVariables,
  gateMovementOrDefault,
  optionLabel,
  HINGE_OPTIONS,
  LATCH_OPTIONS,
  DROP_BOLT_OPTIONS,
  GATE_STOP_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_GUIDE_OPTIONS,
} from "./gateOptionRules";
import { hingeGapForSku, latchGapForSku } from "./gateHardware";
import { colourName } from "../components/calculator-v3/ColourPalette";
import type { BOMLineItem, BOMSource } from "../types/bom.types";
import type { CanonicalPayload, CanonicalRun, CanonicalSegment, CanonicalVariables } from "../types/canonical.types";
import type { UiCalculatorConfig } from "../types/calculatorConfig.types";
import type { ParseResult, ParsedSystemType } from "./describeFenceParser";

// ─── Money ────────────────────────────────────────────────────────────────────

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatHeaderMoney = (value: number) =>
  `$${new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 0,
  }).format(Math.round(value))}`;

// ─── Job name ─────────────────────────────────────────────────────────────────

export function defaultSaveJobName(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  return `Untitled Job (${date})`;
}

// ─── Payload key ──────────────────────────────────────────────────────────────

/** Stable key for BOM inputs — avoids recalc loops from new object references. */
export function payloadBomKey(payload: CanonicalPayload): string {
  return JSON.stringify(payload);
}

// ─── BOM aggregation ──────────────────────────────────────────────────────────

export const lineKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}`;

const bomGroupKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}|${line.unit}`;

export function sourceFromLine(line: BOMLineItem): BOMSource[] {
  return [
    {
      scopeKind:
        line.productCode === "QS_GATE" || line.segmentId?.includes("gate")
          ? "gate"
          : "fence_run",
      scopeId: line.segmentId ?? line.runId ?? "global",
      scopeLabel:
        line.productCode === "QS_GATE" ? "Gate" : line.runId ? "Run" : "Global",
      qty: line.quantity,
    },
  ];
}

export function mergeBomSources(sources: BOMSource[]): BOMSource[] {
  const merged = new Map<string, BOMSource>();
  for (const source of sources) {
    const key = `${source.scopeKind}|${source.scopeId}|${source.scopeLabel}`;
    const existing = merged.get(key);
    if (existing) {
      existing.qty += source.qty;
    } else {
      merged.set(key, { ...source });
    }
  }
  return [...merged.values()];
}

export function aggregateBomItems(items: BOMLineItem[]): BOMLineItem[] {
  const grouped = new Map<string, BOMLineItem>();
  for (const item of items) {
    const key = bomGroupKey(item);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...item });
      continue;
    }
    const quantity = existing.quantity + item.quantity;
    const sources = mergeBomSources([
      ...(existing.sources ?? sourceFromLine(existing)),
      ...(item.sources ?? sourceFromLine(item)),
    ]);
    grouped.set(key, {
      ...existing,
      quantity,
      totalQty: quantity,
      sources,
      unitPrice: existing.unitPrice,
      lineTotal: roundMoney(existing.lineTotal + item.lineTotal),
      notes:
        existing.notes || item.notes
          ? Array.from(
              new Set([existing.notes, item.notes].filter(Boolean)),
            ).join("; ")
          : undefined,
    });
  }
  return [...grouped.values()];
}

function deriveLineForSources(
  line: BOMLineItem,
  predicate: (source: BOMSource) => boolean,
): BOMLineItem | null {
  const sources = (line.sources ?? sourceFromLine(line)).filter(predicate);
  if (sources.length === 0) return null;
  const quantity = sources.reduce((sum, source) => sum + source.qty, 0);
  return {
    ...line,
    quantity,
    totalQty: quantity,
    sources,
    lineTotal: roundMoney(line.unitPrice * quantity),
  };
}

export function filterLinesForScope(
  items: BOMLineItem[],
  predicate: (source: BOMSource) => boolean,
): BOMLineItem[] {
  return items
    .map((item) => deriveLineForSources(item, predicate))
    .filter(Boolean) as BOMLineItem[];
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export function gateLabel(runIndex: number, gateIndex: number) {
  return `R${runIndex + 1} G${gateIndex + 1}`;
}


export const MOUNTING_LABELS: Record<string, string> = {
  in_ground: "Concreted in ground",
  base_plate: "Base plated",
  core_drill: "Core drilled",
};

export function mountingLabel(value: unknown) {
  const key = String(value ?? "in_ground");
  return MOUNTING_LABELS[key] ?? key.replace(/_/g, " ");
}

export function systemLabel(productCode: string) {
  if (productCode === "QSHS") return "Horizontal Slats";
  if (productCode === "VS") return "Vertical Slats";
  if (productCode === "XPL") return "XPress Plus";
  if (productCode === "BAYG") return "BAY-G Infill";
  return productCode;
}

export function gateHardwareLabel(gate: CanonicalSegment) {
  const vars = gate.variables ?? {};
  const movement = gateMovementOrDefault(vars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  if (movement === "sliding") {
    return [
      optionLabel(
        SLIDING_TRACK_OPTIONS,
        vars[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST",
      ),
      optionLabel(
        SLIDING_GUIDE_OPTIONS,
        vars[GATE_SEGMENT_STUB_KEYS.slidingGuideType] ?? "XPSG-GUIDE",
      ),
      optionLabel(
        SLIDING_CATCH_OPTIONS,
        vars[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U",
      ),
    ].join(" / ");
  }
  return [
    optionLabel(HINGE_OPTIONS, vars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B"),
    optionLabel(LATCH_OPTIONS, vars[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA"),
    optionLabel(DROP_BOLT_OPTIONS, vars[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? "none"),
    optionLabel(GATE_STOP_OPTIONS, vars[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none"),
  ]
    .filter((label) => label && !/^No /.test(label))
    .join(" / ");
}

// ─── Layout/persistence utils ─────────────────────────────────────────────────

export function initialRunPaneWidth() {
  if (typeof window === "undefined") return 480;
  const stored = Number(window.localStorage.getItem("qsg-run-pane-width"));
  if (Number.isFinite(stored) && stored > 0) return stored;
  return Math.round(Math.min(680, Math.max(390, window.innerWidth / 3)));
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

export function isAngleDrawingWarning(warning: string): boolean {
  const normalised = warning.toLowerCase();
  return (
    normalised.includes("custom angle") &&
    (normalised.includes("supplier verification") ||
      normalised.includes("verify components"))
  );
}

// ─── Payload factories ────────────────────────────────────────────────────────

export type PendingParsedGate = NonNullable<
  NonNullable<CanonicalPayload["job"]>["pendingGates"]
>[number];

export function createInitialPayload(
  systemType = "QSHS",
  config?: UiCalculatorConfig,
): CanonicalPayload {
  // Seed from the target product's resolved defaults (full cascade);
  // useRunReconciliation finalises once the run mounts.
  const initialVariables = { ...(config?.normalisedVariables ?? {}) };
  const initialHeight = Number(initialVariables.target_height_mm ?? 1800);
  return {
    productCode: systemType,
    schemaVersion: "v1",
    // v3: runs + segments are the sole source of truth — payload.variables
    // is kept as {} (the shared canonical schema still has the field for v4).
    variables: {},
    runs: [
      {
        runId: crypto.randomUUID(),
        productCode: systemType,
        variables: initialVariables,
        leftBoundary: { type: "product_post" },
        rightBoundary: { type: "product_post" },
        segments: [
          {
            segmentId: crypto.randomUUID(),
            sortOrder: 1,
            segmentKind: "panel",
            segmentWidthMm: 0,
            targetHeightMm: initialHeight,
            variables: config?.strategy.fence === "panel" ? { panel_quantity: 1 } : undefined,
          },
        ],
        corners: [],
      },
    ],
  };
}

export function createEmptyPayload(systemType = "QSHS"): CanonicalPayload {
  return {
    productCode: systemType,
    schemaVersion: "v1",
    variables: {},
    runs: [],
  };
}

// ─── Run geometry ─────────────────────────────────────────────────────────────

export function runLengthMm(run: CanonicalRun) {
  return run.segments.reduce((sum, segment) => {
    if (segment.segmentKind === "gate_opening") return sum;
    // Only panel-strategy products ever seed panel_quantity, so a missing value
    // (→ 1) is exactly the non-panel case — no product-code branch needed.
    const qty = Math.max(1, Math.round(Number(segment.variables?.panel_quantity ?? 1)));
    return sum + Number(segment.segmentWidthMm ?? 0) * qty;
  }, 0);
}

// ─── Describe-fence helpers ───────────────────────────────────────────────────

export function productCodeFromParsedSystem(
  systemType: ParsedSystemType | undefined,
) {
  if (systemType === "VS" || systemType === "XPL" || systemType === "BAYG")
    return systemType;
  return "QSHS";
}

export function mountingMethodToVariables(value: string | undefined) {
  if (value === "base_plated") return "base_plate";
  if (value === "core_drilled") return "core_drill";
  return "in_ground";
}

export function boundariesFromTermination(value: string | undefined) {
  if (value === "wall_wall") return { left: "wall", right: "wall" } as const;
  if (value === "post_wall")
    return { left: "product_post", right: "wall" } as const;
  return { left: "product_post", right: "product_post" } as const;
}

export function gateMovementFromParsedGate(
  gate: NonNullable<ParseResult["attributes"]["gates"]>["value"][number],
) {
  if (gate.kind === "sliding") return "sliding" as const;
  if (gate.kind === "double_swing") return "double_swing" as const;
  return "single_swing" as const;
}

export function gateLeavesForOpening(
  movement: ReturnType<typeof gateMovementFromParsedGate>,
  openingWidthMm: number,
) {
  if (movement === "sliding")
    return [{ widthMm: Math.max(1, Math.round(openingWidthMm)) }];
  const hingeGapMm = hingeGapForSku("TC-H-AT-HD-B");
  const latchGapMm = latchGapForSku("LL-DL-KA");
  const clearOpeningMm = clearGateOpeningWidthMm({
    movement,
    openingWidthMm,
    hingeGapMm,
    latchGapMm,
  });
  if (movement === "double_swing") {
    const first = Math.round(clearOpeningMm / 2);
    return [
      { widthMm: Math.max(1, first) },
      { widthMm: Math.max(1, Math.round(clearOpeningMm) - first) },
    ];
  }
  return [{ widthMm: Math.max(1, Math.round(clearOpeningMm)) }];
}

/**
 * Builds a CanonicalRun from a describe-fence parse result.
 * Does NOT dispatch or show toasts — caller handles side effects.
 */
export function buildRunFromDescription(
  result: ParseResult,
  base: CanonicalPayload,
  config?: UiCalculatorConfig,
): { run: CanonicalRun; variables: CanonicalVariables } {
  const parsedSystem = result.attributes.systemType?.value;
  const productCode = productCodeFromParsedSystem(parsedSystem);
  const baseRun = base.runs[0] ?? createInitialPayload(productCode, config).runs[0];
  const runId = baseRun.runId;
  // Seed from the target product's resolved defaults; the parsed overrides are
  // merged on top and useRunReconciliation snaps the cascade afterwards.
  const initialVariables = config?.normalisedVariables ?? {};
  const variables = {
    ...initialVariables,
    ...(baseRun.variables ?? {}),
    ...(result.attributes.heightMm?.value
      ? { target_height_mm: result.attributes.heightMm.value }
      : {}),
    ...(result.attributes.slatSizeMm?.value
      ? { slat_size_mm: result.attributes.slatSizeMm.value }
      : {}),
    ...(result.attributes.gapMm?.value
      ? { slat_gap_mm: result.attributes.gapMm.value }
      : {}),
    ...(result.attributes.colourCode?.value
      ? {
          colour_code: result.attributes.colourCode.value,
          post_colour_code: result.attributes.colourCode.value,
        }
      : {}),
    ...(result.attributes.mountingMethod?.value
      ? {
          mounting_type: mountingMethodToVariables(
            result.attributes.mountingMethod.value,
          ),
          mounting_method: mountingMethodToVariables(
            result.attributes.mountingMethod.value,
          ),
        }
      : {}),
  } as CanonicalVariables;

  const boundaries = boundariesFromTermination(result.attributes.termination?.value);
  const firstSegment = baseRun.segments.find(
    (segment) => segment.segmentKind !== "gate_opening",
  );
  const targetHeightMm = Number(
    variables.target_height_mm ?? firstSegment?.targetHeightMm ?? 1800,
  );
  const parsedGates = result.attributes.gates?.value ?? [];
  const gateWidths = parsedGates.map((gate) => {
    if (gate.widthMm && gate.widthMm > 0) return Math.round(gate.widthMm);
    if (gate.kind === "double_swing") return 1800;
    if (gate.kind === "sliding") return 3000;
    return 900;
  });
  const totalGateWidth = gateWidths.reduce((sum, width) => sum + width, 0);
  const parsedRunLength = Number(result.attributes.runLengthMm?.value ?? 0);
  const fallbackRunLength =
    parsedGates.length > 0
      ? totalGateWidth + (parsedGates.length + 1) * 1000
      : 0;
  const runLength = Math.max(
    parsedRunLength,
    Number(firstSegment?.segmentWidthMm ?? 0),
    fallbackRunLength,
  );
  const panelTotal = Math.max(0, runLength - totalGateWidth);
  const panelCount = parsedGates.length > 0 ? parsedGates.length + 1 : 1;
  const panelWidths =
    parsedGates.length > 0
      ? Array.from({ length: panelCount }, () =>
          Math.max(1, Math.round(panelTotal / panelCount)),
        )
      : [Math.max(0, Math.round(runLength))];
  if (parsedGates.length > 0 && panelWidths.length > 1) {
    const used = panelWidths.reduce((sum, width) => sum + width, 0);
    panelWidths[panelWidths.length - 1] = Math.max(
      1,
      panelWidths[panelWidths.length - 1] + Math.round(panelTotal - used),
    );
  }

  const newSegments: CanonicalSegment[] = [];
  let sortOrder = 1;
  const useSingleCanvasSection = parsedGates.length > 0 && runLength > 0;
  const straightGeometry = {
    points: [
      { x: 0, y: 0 },
      { x: Math.max(1, runLength / 10), y: 0 },
    ],
  };
  const canvasMeta = useSingleCanvasSection
    ? {
        canvasSegmentIndex: 0,
        sourceSegmentLengthMm: Math.max(1, Math.round(runLength)),
      }
    : {};
  const makePanelSegment = (widthMm: number): CanonicalSegment => ({
    segmentId: crypto.randomUUID(),
    sortOrder: sortOrder++,
    segmentKind: "panel",
    segmentWidthMm: Math.max(0, Math.round(widthMm)),
    targetHeightMm,
    ...canvasMeta,
    variables: config?.strategy.fence === "panel" ? { panel_quantity: 1 } : undefined,
  });

  if (parsedGates.length === 0) {
    newSegments.push(makePanelSegment(panelWidths[0] ?? 0));
  } else {
    let distanceCursorMm = 0;
    for (let index = 0; index < parsedGates.length; index++) {
      const precedingPanel = makePanelSegment(panelWidths[index] ?? 1);
      newSegments.push(precedingPanel);
      distanceCursorMm += precedingPanel.segmentWidthMm ?? 0;
      const gate = parsedGates[index];
      const gateWidth = gateWidths[index] ?? 900;
      const movement = gateMovementFromParsedGate(gate);
      const gateCenterFraction =
        runLength > 0
          ? Math.max(
              0,
              Math.min(1, (distanceCursorMm + gateWidth / 2) / runLength),
            )
          : 0.5;
      const gateVariables = {
        ...defaultGateVariables({ ...variables, productCode }, targetHeightMm),
        [GATE_SEGMENT_STUB_KEYS.gateMovement]: movement,
        [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovementInfill(
          movement,
          config?.gateRules.defaultInfill ?? "horizontal",
        ),
        [GATE_SEGMENT_STUB_KEYS.leafCount]:
          movement === "double_swing" ? 2 : 1,
        [GATE_SEGMENT_STUB_KEYS.dropBoltType]:
          movement === "double_swing" ? "SS-0300DB-B" : "none",
        parent_section_id: precedingPanel.segmentId,
      };
      newSegments.push({
        segmentId: crypto.randomUUID(),
        sortOrder: sortOrder++,
        segmentKind: "gate_opening",
        segmentWidthMm: gateWidth,
        targetHeightMm,
        gateProductCode: "QS_GATE",
        positionOnSegment: gateCenterFraction,
        gateAnchor: "center",
        ...canvasMeta,
        variables: gateVariables,
        leaves: gateLeavesForOpening(movement, gateWidth),
      });
      distanceCursorMm += gateWidth;
    }
    newSegments.push(makePanelSegment(panelWidths[panelWidths.length - 1] ?? 1));
  }

  const cornerCount = Math.max(
    0,
    Math.round(Number(result.attributes.cornerCount?.value ?? 0)),
  );
  const corners = Array.from({ length: cornerCount }, () => ({
    cornerId: crypto.randomUUID(),
    afterSegmentId:
      newSegments.find((segment) => segment.segmentKind !== "gate_opening")
        ?.segmentId ?? crypto.randomUUID(),
    type: "90" as const,
  }));

  const run: CanonicalRun = {
    ...baseRun,
    runId,
    productCode,
    variables,
    leftBoundary: { type: boundaries.left },
    rightBoundary: { type: boundaries.right },
    segments: newSegments,
    corners,
    geometry: straightGeometry,
  };

  return { run, variables };
}

// ─── BOM run details (for the BOM pane summary) ───────────────────────────────

export interface BomRunSection {
  label: string;
  panelLine: string;
  overrides: string[];
  gates: string[];
}

export interface BomRunDetail {
  hero: string;
  printHeading: string;
  settings: string;
  sections: BomRunSection[];
}

export function buildBomRunDetails(payload: CanonicalPayload): BomRunDetail[] {
  const gateSummaryForRun = (run: CanonicalRun) => {
    const counts = new Map<string, number>();
    for (const segment of run.segments) {
      if (segment.segmentKind !== "gate_opening") continue;
      const movement = String(
        segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "single_swing",
      );
      const label =
        movement === "sliding"
          ? "sliding gate"
          : movement === "double_swing"
            ? "double swing gate"
            : "pedestrian gate";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => `${count} ${label}${count === 1 ? "" : "s"}`)
      .join(" + ");
  };

  return payload.runs.map((run, runIndex) => {
    const vars = { ...(run.variables ?? {}) };
    const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");
    const sections = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
    // panel_quantity is seeded only on panel-strategy products, so its presence
    // is the panel-strategy signal (no product-code branch).
    const runIsPanelStrategy = run.segments.some(
      (segment) => segment.variables?.panel_quantity != null,
    );
    const lengthMm = run.segments.reduce((sum, segment) => {
      const qty = Math.max(1, Math.round(Number(segment.variables?.panel_quantity ?? 1)));
      return sum + Number(segment.segmentWidthMm ?? 0) * qty;
    }, 0);
    const maxPanelWidth = Number(vars.max_panel_width_mm ?? 2600);
    const runSettings = [
      systemLabel(run.productCode),
      colourName(vars.colour_code),
      `${Number(vars.slat_size_mm ?? 65)}mm slat`,
      `${Number(vars.slat_gap_mm ?? 9)}mm gap`,
      runIsPanelStrategy
        ? null
        : mountingLabel(vars.mounting_method ?? vars.mounting_type),
      `${maxPanelWidth}mm spacing`,
      (run.corners?.length ?? 0) > 0
        ? `${run.corners?.length} corner${run.corners?.length === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean) as string[];

    const sectionRows = sections.map((section, sectionIndex) => {
      const sectionVars = section.variables ?? {};
      const width = Number(section.segmentWidthMm ?? 0);
      const panelCount =
        width > 0
          ? Math.max(
              1,
              Math.ceil(
                width / Number(sectionVars.max_panel_width_mm ?? maxPanelWidth),
              ),
            )
          : 0;
      const postSpacing = panelCount > 0 ? Math.round(width / panelCount) : 0;
      const overrides = [
        ["System Type", sectionVars.product_code, run.productCode],
        ["Color", sectionVars.colour_code, vars.colour_code],
        ["Slat size", sectionVars.slat_size_mm, vars.slat_size_mm],
        ["Gap size", sectionVars.slat_gap_mm, vars.slat_gap_mm],
        [
          "Post mounting",
          sectionVars.mounting_method ?? sectionVars.mounting_type,
          vars.mounting_method ?? vars.mounting_type,
        ],
        ["Max post spacing", sectionVars.max_panel_width_mm, vars.max_panel_width_mm],
      ]
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .filter(([, value, master]) => String(value) !== String(master ?? ""))
        .map(([label, value]) => {
          if (label === "Color") return `${label}: ${colourName(value)}`;
          if (label === "Post mounting") return `${label}: ${mountingLabel(value)}`;
          if (
            label === "Slat size" ||
            label === "Gap size" ||
            label === "Max post spacing"
          ) {
            return `${label}: ${value}mm`;
          }
          if (label === "System Type") return `${label}: ${systemLabel(String(value))}`;
          return `${label}: ${value}`;
        });

      const linkedGates = gates.filter((gate) => {
        const parentSectionId = gate.variables?.parent_section_id;
        return (
          parentSectionId === section.segmentId ||
          (!parentSectionId && sectionIndex === 0)
        );
      });

      return {
        label: `Section ${sectionIndex + 1} \u2014 ${(width / 1000).toFixed(2)}m \u00d7 ${Number(section.targetHeightMm ?? vars.target_height_mm ?? 1800)}mm`,
        panelLine: `${panelCount} panel${panelCount === 1 ? "" : "s"} \u2014 post spacing ${postSpacing}mm`,
        overrides,
        gates: linkedGates.map((gate) => {
          const gateIndex = gates.findIndex(
            (candidate) => candidate.segmentId === gate.segmentId,
          );
          const movement = gateMovementOrDefault(
            gate.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement],
          );
          const movementLabel =
            movement === "double_swing"
              ? "Double swing"
              : movement === "sliding"
                ? "Sliding"
                : "Single swing";
          return `Gate ${gateIndex + 1} \u2014 ${movementLabel} \u2014 ${Number(gate.segmentWidthMm ?? 0)}mm \u2014 ${gateHardwareLabel(gate) || "default hardware"}`;
        }),
      };
    });

    return {
      hero: `Run ${runIndex + 1} - ${(lengthMm / 1000).toFixed(2)}m - ${systemLabel(run.productCode)} - ${gateSummaryForRun(run) || "no gates"}`,
      printHeading: `Run ${runIndex + 1}`,
      settings: runSettings.join(" · "),
      sections: sectionRows,
    };
  });
}

// ─── Animated number hook ─────────────────────────────────────────────────────

export function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const start = previous.current;
    const delta = target - start;
    if (Math.abs(delta) < 0.01) {
      setValue(target);
      previous.current = target;
      return;
    }

    let frame = 0;
    const startTime = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + delta * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previous.current = target;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

// ─── Gate position confirmation ────────────────────────────────────────────────

/**
 * Pure function — builds the updated CanonicalPayload after confirming a gate
 * position from the describe flow. Returns null if the run can't be split.
 */
export function buildConfirmGatePayload(
  payload: CanonicalPayload,
  gate: PendingParsedGate,
  distanceFromStartMm: number,
  config?: UiCalculatorConfig,
): CanonicalPayload {
  const nextRuns = payload.runs.map((run) => {
    if (run.runId !== gate.runId) return run;
    const fenceSegments = run.segments.filter((s) => s.segmentKind !== "gate_opening");
    const firstSegment = fenceSegments[0];
    const totalLength = runLengthMm(run);
    const gateWidth = gate.widthMm ?? 1000;
    if (!firstSegment || totalLength <= gateWidth) return run;
    const leftWidth = Math.max(1, Math.round(distanceFromStartMm - gateWidth / 2));
    const rightWidth = Math.max(1, Math.round(totalLength - distanceFromStartMm - gateWidth / 2));
    const baseVars = { ...(run.variables ?? {}), productCode: run.productCode };
    const movement: "sliding" | "double_swing" | "single_swing" =
      gate.kind === "sliding" ? "sliding" : gate.kind === "double_swing" ? "double_swing" : "single_swing";
    const targetHeightMm =
      firstSegment.targetHeightMm ??
      Number(run.variables?.target_height_mm ?? 1800);
    const gateVariables = {
      ...defaultGateVariables(baseVars, targetHeightMm),
      [GATE_SEGMENT_STUB_KEYS.gateMovement]: movement,
      [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovementInfill(movement, config?.gateRules.defaultInfill ?? "horizontal"),
      [GATE_SEGMENT_STUB_KEYS.leafCount]: movement === "double_swing" ? 2 : 1,
      [GATE_SEGMENT_STUB_KEYS.dropBoltType]: movement === "double_swing" ? "SS-0300DB-B" : "none",
    };
    const leftSegment: CanonicalSegment = { ...firstSegment, sortOrder: 1, segmentWidthMm: leftWidth };
    const gateSegment: CanonicalSegment = {
      segmentId: gate.id,
      sortOrder: 2,
      segmentKind: "gate_opening",
      segmentWidthMm: gateWidth,
      targetHeightMm,
      gateProductCode: "QS_GATE",
      variables: gateVariables,
    };
    const rightSegment: CanonicalSegment = {
      ...firstSegment,
      segmentId: crypto.randomUUID(),
      sortOrder: 3,
      segmentWidthMm: rightWidth,
    };
    return { ...run, segments: [leftSegment, gateSegment, rightSegment] };
  });
  return {
    ...payload,
    job: {
      ...(payload.job ?? {}),
      pendingGates: payload.job?.pendingGates?.filter((item) => item.id !== gate.id) ?? [],
    },
    runs: nextRuns,
  };
}
