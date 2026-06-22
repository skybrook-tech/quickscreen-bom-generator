import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { calcRunStats } from "../../lib/runStats";
import { maxPanelWidthForSystem } from "../../lib/productOptionRules";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import { gateMovementOrDefault } from "../../lib/gateOptionRules";
import { getCustomCalculators, isCustomCalculator } from "../../lib/customCalculators";
import {
  COLOUR_DISPLAY_NAMES,
  GATE_DIRECTION_DISPLAY_NAMES,
  GATE_MOVEMENT_DISPLAY_NAMES,
  MOUNTING_DISPLAY_NAMES,
  SYSTEM_NAMES,
  TERMINATION_DISPLAY_NAMES,
  displayName,
} from "../../lib/displayNames";

interface RunDetailsPanelProps {
  payload: CanonicalPayload | null;
}

const PARENT_SECTION_KEY = "parent_section_id";

function mm(segment: CanonicalSegment) {
  return Number(segment.segmentWidthMm ?? 0);
}

function varsFor(run: CanonicalRun, payload: CanonicalPayload) {
  return { ...(payload.variables ?? {}), ...(run.variables ?? {}) };
}

function runLength(run: CanonicalRun) {
  return run.segments.reduce((sum, segment) => sum + mm(segment), 0);
}

function gateCountLabel(count: number) {
  if (count === 0) return "no gates";
  if (count === 1) return "1 gate";
  return `${count} gates`;
}

function gateLabel(segment: CanonicalSegment) {
  const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const direction = displayName(
    GATE_DIRECTION_DISPLAY_NAMES,
    segment.variables?.[GATE_SEGMENT_STUB_KEYS.openingDirection] ?? (movement === "sliding" ? "right" : "out"),
    "",
  );
  const hardware =
    segment.variables?.[GATE_SEGMENT_STUB_KEYS.hingeType] ??
    segment.variables?.[GATE_SEGMENT_STUB_KEYS.latchType] ??
    "default hardware";
  return `${displayName(GATE_MOVEMENT_DISPLAY_NAMES, movement)} - ${mm(segment)}mm - ${direction} - ${hardware}`;
}

function segmentOverrides(segment: CanonicalSegment, runVariables: Record<string, unknown>, productCode: string) {
  const vars = segment.variables ?? {};
  const customCalcs = getCustomCalculators();
  const isCustom = isCustomCalculator(productCode);
  const customCalc = isCustom ? customCalcs.find(c => c.id === productCode) : null;

  const hasColor = !isCustom || customCalc?.variables.some(v => ["color", "colour_code", "colour"].includes(v.field_key));
  const hasSlatSize = !isCustom || customCalc?.variables.some(v => ["slat_size_mm", "slat_size"].includes(v.field_key));
  const hasGapSize = !isCustom || customCalc?.variables.some(v => ["slat_gap_mm", "gap_size", "gap"].includes(v.field_key));
  const hasMounting = (!isCustom && productCode !== "BAYG") || (isCustom && customCalc?.variables.some(v => ["mounting_method", "mounting_type", "mounting"].includes(v.field_key)));

  const checks = [
    ["system", segment.variables?.product_code, undefined, true],
    ["colour", vars.colour_code ?? vars.color ?? vars.colour, runVariables.colour_code ?? runVariables.color ?? runVariables.colour, hasColor],
    ["slat size", vars.slat_size_mm ?? vars.slat_size, runVariables.slat_size_mm ?? runVariables.slat_size, hasSlatSize],
    ["gap", vars.slat_gap_mm ?? vars.gap_size ?? vars.gap, runVariables.slat_gap_mm ?? runVariables.gap_size ?? runVariables.gap, hasGapSize],
    ["mounting", vars.mounting_type ?? vars.mounting_method, runVariables.mounting_type ?? runVariables.mounting_method, hasMounting],
  ] as const;

  const customOverrides: string[] = [];
  if (customCalc) {
    const standardKeys = new Set([
      "target_height_mm", "paling_height", "height", "paling_height_mm",
      "color", "colour_code", "colour",
      "slat_size_mm", "slat_size",
      "slat_gap_mm", "gap_size", "gap",
      "mounting_method", "mounting_type", "mounting",
      "max_panel_width_mm", "max_post_spacing", "post_spacing"
    ]);
    customCalc.variables.forEach((v) => {
      if (!standardKeys.has(v.field_key)) {
        const val = vars[v.field_key];
        const master = runVariables[v.field_key];
        if (val !== undefined && val !== null && val !== "" && String(val) !== String(master ?? "")) {
          const displayVal = typeof val === "boolean" ? (val ? "Yes" : "No") : String(val);
          customOverrides.push(`${v.label}: ${displayVal}`);
        }
      }
    });
  }

  const standardOverrides = checks
    .filter(([, , , active]) => active)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .filter(([, value, master]) => String(value) !== String(master ?? ""))
    .map(([label, value]) => `${label} ${value}${label.includes("size") || label === "gap" ? "mm" : ""}`);

  return [...standardOverrides, ...customOverrides];
}

function openRun(runId: string) {
  window.dispatchEvent(new CustomEvent("qsbom:open-run", { detail: runId }));
}

function openSegment(segmentId: string) {
  window.dispatchEvent(new CustomEvent("qsbom:open-segment", { detail: segmentId }));
}

export function RunDetailsPanel({ payload }: RunDetailsPanelProps) {
  if (!payload) return null;

  return (
    <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border border-brand-border bg-brand-card p-3">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-brand-muted">
        Run details
      </h3>
      {payload.runs.map((run, runIdx) => {
        const runVariables = varsFor(run, payload);
        const stats = calcRunStats(
          run,
          Number(runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode)),
        );
        const fenceSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
        const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");

            const customCalcs = getCustomCalculators();
            const isCustom = isCustomCalculator(run.productCode);
            const customCalc = isCustom ? customCalcs.find(c => c.id === run.productCode) : null;

            const hasColor = !isCustom || customCalc?.variables.some(v => ["color", "colour_code", "colour"].includes(v.field_key));
            const hasSlatSize = !isCustom || customCalc?.variables.some(v => ["slat_size_mm", "slat_size"].includes(v.field_key));
            const hasGapSize = !isCustom || customCalc?.variables.some(v => ["slat_gap_mm", "gap_size", "gap"].includes(v.field_key));
            const hasMounting = (!isCustom && run.productCode !== "BAYG") || (isCustom && customCalc?.variables.some(v => ["mounting_method", "mounting_type", "mounting"].includes(v.field_key)));

            const customFieldsToRender = customCalc
              ? customCalc.variables.filter(v => ![
                  "target_height_mm", "paling_height", "height", "paling_height_mm",
                  "color", "colour_code", "colour",
                  "slat_size_mm", "slat_size",
                  "slat_gap_mm", "gap_size", "gap",
                  "mounting_method", "mounting_type", "mounting",
                  "max_panel_width_mm", "max_post_spacing", "post_spacing"
                ].includes(v.field_key))
              : [];

            return (
              <section key={run.runId} className="rounded-xl border border-brand-border/70 bg-brand-bg/45 p-3">
                <button
                  type="button"
                  className="w-full text-left text-sm font-black text-brand-text hover:text-brand-primary"
                  onClick={() => openRun(run.runId)}
                >
                  Run {runIdx + 1} - {(runLength(run) / 1000).toFixed(2)}m - {stats.panels} panel{stats.panels === 1 ? "" : "s"} - {gateCountLabel(gates.length)}
                </button>
                <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs font-semibold text-brand-muted sm:grid-cols-2">
                  <div><dt className="inline">System: </dt><dd className="inline text-brand-text">{displayName(SYSTEM_NAMES, run.productCode)}</dd></div>
                  {hasSlatSize && (
                    <div><dt className="inline">Slat size: </dt><dd className="inline text-brand-text">{Number(runVariables.slat_size_mm ?? runVariables.slat_size ?? 65)}mm</dd></div>
                  )}
                  {hasGapSize && (
                    <div><dt className="inline">Gap: </dt><dd className="inline text-brand-text">{Number(runVariables.slat_gap_mm ?? runVariables.gap_size ?? runVariables.gap ?? 9)}mm</dd></div>
                  )}
                  {hasColor && (
                    <div><dt className="inline">Colour: </dt><dd className="inline text-brand-text">{displayName(COLOUR_DISPLAY_NAMES, runVariables.colour_code ?? runVariables.color ?? runVariables.colour, "Black")}</dd></div>
                  )}
                  {hasMounting && (
                    <div><dt className="inline">Mounting: </dt><dd className="inline text-brand-text">{displayName(MOUNTING_DISPLAY_NAMES, runVariables.mounting_type ?? runVariables.mounting_method, "Concreted in ground")}</dd></div>
                  )}
                  {customFieldsToRender.map((v) => {
                    const val = runVariables[v.field_key] ?? v.default_value_json;
                    const displayVal = typeof val === "boolean" ? (val ? "Yes" : "No") : String(val);
                    return (
                      <div key={v.field_key}>
                        <dt className="inline">{v.label}: </dt>
                        <dd className="inline text-brand-text">{displayVal}</dd>
                      </div>
                    );
                  })}
                  <div><dt className="inline">Termination L: </dt><dd className="inline text-brand-text">{displayName(TERMINATION_DISPLAY_NAMES, run.leftBoundary?.type, "Post")}</dd></div>
                  <div><dt className="inline">Termination R: </dt><dd className="inline text-brand-text">{displayName(TERMINATION_DISPLAY_NAMES, run.rightBoundary?.type, "Post")}</dd></div>
                  <div><dt className="inline">Corners: </dt><dd className="inline text-brand-text">{run.corners?.length ?? 0}</dd></div>
                </dl>
                <div className="mt-3 space-y-2">
                  {fenceSegments.map((segment, sectionIdx) => {
                    const linkedGates = gates.filter((gate) => gate.variables?.[PARENT_SECTION_KEY] === segment.segmentId);
                    const maxWidth = Number(segment.variables?.max_panel_width_mm ?? runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode));
                    const panelCount = mm(segment) > 0 ? Math.max(1, Math.ceil(mm(segment) / maxWidth)) : 0;
                    const overrides = segmentOverrides(segment, runVariables, run.productCode);
                return (
                  <div key={segment.segmentId} className="rounded-lg border border-brand-border/50 bg-brand-card/70 p-2">
                    <button
                      type="button"
                      className="text-left text-xs font-black text-brand-text hover:text-brand-primary"
                      onClick={() => openSegment(segment.segmentId)}
                    >
                      Section {sectionIdx + 1} - {(mm(segment) / 1000).toFixed(2)}m - {Number(segment.targetHeightMm ?? 1800)}mm high - {panelCount} panel{panelCount === 1 ? "" : "s"} - {gateCountLabel(linkedGates.length)}
                    </button>
                    <p className="mt-1 text-xs font-semibold text-brand-muted">
                      {overrides.length ? `Overrides: ${overrides.join(", ")}` : "Same settings as run defaults"}
                    </p>
                    {linkedGates.map((gate) => (
                      <button
                        key={gate.segmentId}
                        type="button"
                        className="mt-1 block text-left text-xs font-bold text-brand-warning hover:text-brand-primary"
                        onClick={() => openSegment(gate.segmentId)}
                      >
                        {gateLabel(gate)}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
