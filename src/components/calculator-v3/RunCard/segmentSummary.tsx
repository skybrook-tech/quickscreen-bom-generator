import { HINGE_HARDWARE, LATCH_HARDWARE, baseHardwareSku } from "../../../lib/gateHardware";
import {
  DROP_BOLT_OPTIONS,
  GATE_STOP_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_GUIDE_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  gateMovementOrDefault,
  optionLabel,
} from "../../../lib/gateOptionRules";
import { GATE_SEGMENT_STUB_KEYS } from "../../../lib/segmentTermination";
import { segmentDifferenceBits } from "../../../lib/runFieldOverrides";
import type { UiCalculatorConfig } from "../../../types/calculatorConfig.types";
import { colourName } from "../ColourPalette";
import { valueLabel, type SchemaField } from "../SchemaDrivenForm";

export type SummaryItem = {
  label: string;
  value: string | number;
  emphasis?: boolean;
};

export function SummaryBit({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <span className={`inline-flex max-w-full items-baseline gap-1 whitespace-nowrap ${emphasis ? "text-[13px]" : ""}`}>
      <span className="shrink-0 font-semibold text-brand-muted">{label}:</span>
      <strong className={`min-w-0 truncate font-extrabold text-brand-text ${emphasis ? "text-sm" : ""}`}>{value}</strong>
    </span>
  );
}

export function postLabel(
  postSizeField: SchemaField | undefined,
  variables: Record<string, unknown>,
) {
  const postSystem = String(variables.post_system ?? "standard_50");
  if (postSystem === "xpl") return "XPress Plus post";
  return valueLabel(postSizeField, variables.post_size ?? "50", "50mm Post Standard");
}

export function gateMovementLabel(value: unknown) {
  const movement = gateMovementOrDefault(value);
  if (movement === "double_swing") return "Double swing";
  if (movement === "sliding") return "Sliding";
  return "Single swing";
}

export function hardwareProductName(kind: "hinge" | "latch", value: unknown) {
  const base = baseHardwareSku(value);
  const catalogue = kind === "hinge" ? HINGE_HARDWARE : LATCH_HARDWARE;
  return catalogue.find((item) => item.sku === base || item.skuW === String(value))?.label ?? String(value ?? "");
}

export function gateHardwareSummaryItems(variables: Record<string, unknown>): SummaryItem[] {
  const movement = gateMovementOrDefault(variables[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  if (movement === "sliding") {
    const track = String(variables[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST");
    const guide = String(variables[GATE_SEGMENT_STUB_KEYS.slidingGuideType] ?? "XPSG-GUIDE");
    const catchType = String(variables[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U");
    return [
      { label: "Track", value: optionLabel(SLIDING_TRACK_OPTIONS, track) },
      { label: "Guide", value: optionLabel(SLIDING_GUIDE_OPTIONS, guide) },
      { label: "Catch", value: optionLabel(SLIDING_CATCH_OPTIONS, catchType) },
    ];
  }
  const hinge = String(variables[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B");
  const latch = String(variables[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA");
  const dropBolt = String(variables[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? "none");
  const gateStop = String(variables[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none");
  return [
    hinge !== "none" ? { label: "Hinge", value: hardwareProductName("hinge", hinge) } : null,
    latch !== "none" ? { label: "Latch", value: hardwareProductName("latch", latch) } : null,
    dropBolt !== "none" ? { label: "Drop bolt", value: optionLabel(DROP_BOLT_OPTIONS, dropBolt) } : null,
    gateStop !== "none" ? { label: "Gate stop", value: optionLabel(GATE_STOP_OPTIONS, gateStop) } : null,
  ].filter(Boolean) as SummaryItem[];
}

export function sameValue(left: unknown, right: unknown) {
  if (left === undefined || left === null || left === "") {
    return right === undefined || right === null || right === "";
  }
  return String(left) === String(right ?? "");
}

export function unsetOrSame(vars: Record<string, unknown>, key: string, defaultValue: unknown) {
  return vars[key] === undefined || vars[key] === null || sameValue(vars[key], defaultValue);
}

// ── Segment "difference bits" ────────────────────────────────────────────────
// Data-driven descriptor table for the "settings that differ from the run
// defaults" chips. Mirrors RunCard's summary-chip build: a list of descriptors
// mapped to bits, plus a generic tail for any run-scope field a product declares
// that has no bespoke bit. Consumed by the <SegmentSummary> component.

/** One rendered difference bit. `key` is stable (field_key or a bespoke id). */
export type DifferenceBit = {
  key: string;
  label: string;
  value: string | number;
  changed: boolean;
  /** Excluded from BOTH the collapsed line and the settings chips (Height). */
  hideFromDiff?: boolean;
  /** Excluded from the settings chips under panel strategy (posts/mounting/panels). */
  hideWhenPanel?: boolean;
};

/** Everything a bit's `value`/`changed`/`when` accessor reads. */
export type DiffCtx = {
  gate: boolean;
  config: UiCalculatorConfig;
  segmentVariables: Record<string, unknown>;
  masterVariables: Record<string, unknown>;
  segProductCode: string;
  runProductCode: string;
  selectedHeight: number;
  fenceColour: string;
  masterFenceColour: string;
  postColour: string;
  masterPostColour: string;
  isPanelStrategy: boolean;
  maxSpacing: number;
  masterMaxSpacing: number;
  panelCount: number;
  masterPanelCount: number;
  panelWidthSummary: string;
  gateBuild: string;
  expectedGateBuild: boolean;
  slatSizeField: SchemaField | undefined;
  slatGapField: SchemaField | undefined;
  postSizeField: SchemaField | undefined;
  mountingField: SchemaField | undefined;
};

type DiffBitSpec = {
  key: string;
  label: string;
  value: (c: DiffCtx) => string | number;
  changed: (c: DiffCtx) => boolean;
  /** Conditional inclusion, e.g. only show Post colour when it differs from fence. */
  when?: (c: DiffCtx) => boolean;
  hideFromDiff?: boolean;
  hideWhenPanel?: boolean;
};

// Run-scope field_keys that already have a bespoke bit below, so the generic
// tail (segmentDifferenceBits) must skip them to avoid duplicates.
const BESPOKE_DIFFERENCE_FIELD_KEYS = new Set([
  "colour_code",
  "post_colour_code",
  "slat_size_mm",
  "slat_gap_mm",
  "post_system",
  "post_size",
  "mounting_type",
  "mounting_method",
  "max_panel_width_mm",
]);

// Shared between the gate and fence tables (identical logic in both).
const heightSpec: DiffBitSpec = {
  key: "height",
  label: "Height",
  value: (c) => `${c.selectedHeight}mm`,
  changed: (c) => !sameValue(c.selectedHeight, c.masterVariables.target_height_mm ?? 1800),
  hideFromDiff: true,
};

const colourSpec: DiffBitSpec = {
  key: "colour_code",
  label: "Colour",
  value: (c) => colourName(c.fenceColour, c.config.colours.names),
  changed: (c) => !sameValue(c.fenceColour, c.masterFenceColour),
};

const postColourSpec: DiffBitSpec = {
  key: "post_colour_code",
  label: "Post colour",
  value: (c) => colourName(c.postColour, c.config.colours.names),
  changed: (c) => !sameValue(c.postColour, c.masterPostColour),
  when: (c) => c.postColour !== c.fenceColour,
};

const GATE_DIFFERENCE_BIT_SPECS: DiffBitSpec[] = [
  heightSpec,
  {
    key: "gate_build",
    label: "Gate style",
    value: (c) => (c.gateBuild.includes("vertical") ? "Vertical slat" : "Horizontal slat"),
    changed: (c) => !c.expectedGateBuild,
  },
  colourSpec,
  {
    key: "slat_size_mm",
    label: "Slat",
    value: (c) =>
      `${c.segmentVariables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? c.masterVariables.slat_size_mm ?? 65}mm`,
    changed: (c) =>
      !sameValue(
        c.segmentVariables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? c.masterVariables.slat_size_mm ?? 65,
        c.masterVariables.slat_size_mm ?? 65,
      ),
  },
  {
    key: "slat_gap_mm",
    label: "Gap",
    value: (c) =>
      `${c.segmentVariables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? c.masterVariables.slat_gap_mm ?? 9}mm`,
    changed: (c) =>
      !sameValue(
        c.segmentVariables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? c.masterVariables.slat_gap_mm ?? 9,
        c.masterVariables.slat_gap_mm ?? 9,
      ),
  },
  postColourSpec,
];

const FENCE_DIFFERENCE_BIT_SPECS: DiffBitSpec[] = [
  {
    key: "system",
    label: "System",
    value: (c) => c.segProductCode,
    changed: (c) => !sameValue(c.segProductCode, c.runProductCode),
  },
  heightSpec,
  colourSpec,
  postColourSpec,
  {
    key: "slat_size_mm",
    label: "Slat",
    value: (c) => valueLabel(c.slatSizeField, c.segmentVariables.slat_size_mm ?? 65),
    changed: (c) => !sameValue(c.segmentVariables.slat_size_mm ?? 65, c.masterVariables.slat_size_mm ?? 65),
  },
  {
    key: "slat_gap_mm",
    label: "Gap",
    value: (c) => valueLabel(c.slatGapField, c.segmentVariables.slat_gap_mm ?? 9),
    changed: (c) => !sameValue(c.segmentVariables.slat_gap_mm ?? 9, c.masterVariables.slat_gap_mm ?? 9),
  },
  {
    key: "post",
    label: "Post",
    value: (c) => postLabel(c.postSizeField, c.segmentVariables),
    changed: (c) =>
      !c.isPanelStrategy &&
      (!sameValue(c.segmentVariables.post_system, c.masterVariables.post_system) ||
        !sameValue(c.segmentVariables.post_size ?? 50, c.masterVariables.post_size ?? 50)),
    hideWhenPanel: true,
  },
  {
    key: "mounting",
    label: "Mounting",
    value: (c) =>
      valueLabel(
        c.mountingField,
        c.segmentVariables.mounting_method ?? c.segmentVariables.mounting_type ?? "in_ground",
        "Concreted in ground",
      ),
    changed: (c) =>
      !c.isPanelStrategy &&
      !sameValue(
        c.segmentVariables.mounting_method ?? c.segmentVariables.mounting_type ?? "in_ground",
        c.masterVariables.mounting_method ?? c.masterVariables.mounting_type ?? "in_ground",
      ),
    hideWhenPanel: true,
  },
  {
    key: "panel_count",
    label: "Panel Count",
    value: (c) => c.panelCount,
    changed: (c) => !c.isPanelStrategy && !sameValue(c.panelCount, c.masterPanelCount),
    hideWhenPanel: true,
  },
  {
    key: "panel_width",
    label: "Panel width",
    value: (c) => c.panelWidthSummary,
    changed: (c) => !c.isPanelStrategy && !sameValue(c.maxSpacing, c.masterMaxSpacing),
    hideWhenPanel: true,
  },
];

/**
 * Build the ordered difference bits for a segment. Pure — no JSX — so it can be
 * unit-tested and reused by <SegmentSummary>. Gate and fence use their own
 * ordered spec tables (the display order genuinely differs between them); the
 * fence table also appends a generic per-field tail for any run-scope field the
 * product declares that has no bespoke bit above.
 */
export function buildDifferenceBits(ctx: DiffCtx): DifferenceBit[] {
  const specs = ctx.gate ? GATE_DIFFERENCE_BIT_SPECS : FENCE_DIFFERENCE_BIT_SPECS;
  const bespoke: DifferenceBit[] = specs
    .filter((spec) => spec.when?.(ctx) ?? true)
    .map((spec) => ({
      key: spec.key,
      label: spec.label,
      value: spec.value(ctx),
      changed: spec.changed(ctx),
      hideFromDiff: spec.hideFromDiff,
      hideWhenPanel: spec.hideWhenPanel,
    }));
  const generic: DifferenceBit[] = ctx.gate
    ? []
    : segmentDifferenceBits(ctx.config, ctx.segmentVariables, ctx.masterVariables)
        .filter((bit) => !BESPOKE_DIFFERENCE_FIELD_KEYS.has(bit.field_key))
        .map((bit) => ({ key: bit.field_key, label: bit.label, value: bit.value, changed: bit.changed }));
  return [...bespoke, ...generic];
}

/**
 * Renders a segment's difference summary in one of two presentations. Owns
 * building the bits (via the pure `buildDifferenceBits`) so callers don't
 * assemble summary strings/arrays inline. Returns null when there is nothing
 * to show. (Lives in this module rather than a `SegmentSummary.tsx` file because
 * the case-insensitive filesystem would collide with `segmentSummary.tsx`.)
 */
export function SegmentSummary({
  mode,
  ctx,
  matchesMaster,
  baseItems,
}: {
  /** `line` = collapsed one-liner subtitle; `chips` = expanded "differs from run" panel. */
  mode: "line" | "chips";
  ctx: DiffCtx;
  matchesMaster: boolean;
  /** Always-shown base summary (gate type + hardware, panel qty) — line mode only. */
  baseItems?: SummaryItem[];
}) {
  const bits = buildDifferenceBits(ctx);

  if (mode === "line") {
    const diffs = matchesMaster ? [] : bits.filter((b) => b.changed && !b.hideFromDiff);
    const text = [...(ctx.gate ? (baseItems ?? []) : []), ...diffs]
      .map((item) => `${item.label}: ${item.value}`)
      .join(", ");
    if (!text) return null;
    return (
      <div
        className="min-w-0 truncate text-[11px] font-semibold leading-tight text-brand-muted"
        title={text}
      >
        {text}
      </div>
    );
  }

  // mode === "chips"
  if (matchesMaster) return null;
  const visible = bits.filter(
    (b) => !b.hideFromDiff && !(ctx.isPanelStrategy && b.hideWhenPanel),
  );
  return (
    <div className="rounded-lg border border-brand-border/60 bg-brand-card/70 p-3">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
        Settings that differ from run settings
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-tight">
        {visible
          .filter((item) => item.changed)
          .map((item) => (
            <SummaryBit key={item.key} label={item.label} value={item.value} />
          ))}
      </div>
    </div>
  );
}
