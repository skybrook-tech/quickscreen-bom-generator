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
  productCode: string,
  variables: Record<string, unknown>,
) {
  const postSystem = String(
    variables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  if (productCode === "XPL" || postSystem === "xpl") return "XPress Plus post";
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
