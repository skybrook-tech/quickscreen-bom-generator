import { X } from "lucide-react";
import type { CanonicalSegment, CanonicalVariables } from "../../../types/canonical.types";
import { gateTypeLabel, validateGateWidth } from "../../../lib/gateConstraints";
import type { DerivedHeight } from "../../../lib/heights";
import NumberInput from "../../shared/NumberInput";
import { SummaryBit } from "./segmentSummary";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  isPanelStrategy: boolean;
  isFreeform: boolean;
  gate: boolean;
  segmentVariables: CanonicalVariables;
  heightEntries: DerivedHeight[];
  heightInputsReady: boolean;
  selectedHeight: number;
  gateWidthValidation: ReturnType<typeof validateGateWidth> | null;
  matchesMaster: boolean;
  visibleSettings: Array<{ label: string; value: string | number; changed: boolean }>;
  showRunDefaultsTeaching: boolean;
  onDismissRunDefaultsTeaching?: () => void;
  updateGeometry: (key: "segmentWidthMm" | "targetHeightMm", value: number) => void;
  updateDerivedHeight: (entry: DerivedHeight) => void;
  updatePanelQuantity: (value: number) => void;
  switchGateToAlternative: () => void;
}

export function SegmentRowSettings({
  runId,
  seg,
  isPanelStrategy,
  isFreeform,
  gate,
  segmentVariables,
  heightEntries,
  heightInputsReady,
  selectedHeight,
  gateWidthValidation,
  matchesMaster,
  visibleSettings,
  showRunDefaultsTeaching,
  onDismissRunDefaultsTeaching,
  updateGeometry,
  updateDerivedHeight,
  updatePanelQuantity,
  switchGateToAlternative,
}: Props) {
  return (
    <div className="space-y-4 border-t border-brand-border/50 bg-brand-bg/50 p-3">
      {showRunDefaultsTeaching && (
        <div className="relative rounded-lg border border-brand-warning/40 bg-brand-warning/10 px-3 py-2 pr-9">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-warning">
            RUN DEFAULTS
          </p>
          <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-brand-text">
            These settings become the default for every section in this run. You can override per segment later by double-clicking the segment.
          </p>
          <button
            type="button"
            onClick={onDismissRunDefaultsTeaching}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-card hover:text-brand-danger"
            aria-label="Dismiss run defaults teaching"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        <label className="flex flex-col gap-1">
          <div className="flex items-center gap-1">

            <span className="text-sm font-bold text-brand-muted">Height (mm)</span>

          </div>
          {isFreeform ? (
            <>

              <NumberInput
                value={seg.targetHeightMm ?? 1800}
                className="w-24 px-2 py-1.5 text-center tabular-nums"
                onChange={(v) => updateGeometry("targetHeightMm", Number(v))}
              />
            </>
          ) : heightEntries.length > 0 && heightInputsReady ? (
            <>

              <select
                value={selectedHeight}
                onChange={(event) => {
                  const entry = heightEntries.find(
                    (item) => item.height === Number(event.target.value),
                  );
                  if (entry) updateDerivedHeight(entry);
                }}
                className="w-44 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              >
                {heightEntries.map((entry) => (
                  <option key={entry.N} value={entry.height}>
                    {entry.height}mm - {entry.N} slats
                  </option>
                ))}
              </select>

            </>
          ) : (
            <select
              disabled
              className="w-52 rounded-lg border border-brand-border bg-brand-card/70 px-3 py-2 text-sm font-semibold text-brand-muted shadow-sm"
            >
              <option>Select slat size and gap first</option>
            </select>
          )}
          {isFreeform ? (
            <span className="text-xs text-brand-muted/70">Custom height</span>
          ) : (
            <span className="text-xs text-brand-muted">Calculated for {segmentVariables.slat_size_mm ?? "?"}mm x {segmentVariables.slat_gap_mm ?? "?"}mm gap</span>
          )}
        </label>
        {isPanelStrategy && !gate && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Quantity</span>
            <NumberInput
              value={Math.max(1, Math.round(Number(seg.variables?.panel_quantity ?? 1)))}
              step={1}
              min={1}
              className="w-24 px-2 py-1.5 text-center tabular-nums"
              onChange={(v) => updatePanelQuantity(Number(v))}
            />
          </label>
        )}
      </div>
      {gateWidthValidation?.status === "warning" && (
        <div className="rounded-lg border border-brand-warning/40 bg-brand-warning/10 px-3 py-2 text-xs font-bold text-brand-warning">
          {gateWidthValidation.message}
        </div>
      )}
      {gateWidthValidation?.status === "error" && (
        <div className="space-y-2 rounded-lg border border-brand-danger/40 bg-brand-danger/10 px-3 py-2 text-xs font-bold text-brand-danger">
          <p>{gateWidthValidation.message}</p>
          {gateWidthValidation.alternative && (
            <button
              type="button"
              onClick={switchGateToAlternative}
              className="min-h-11 rounded-lg border border-brand-danger/50 bg-brand-card px-3 py-2 text-xs font-black text-brand-danger hover:shadow-sm"
            >
              Switch to {gateTypeLabel(gateWidthValidation.alternative)}
            </button>
          )}
        </div>
      )}
      <div className="rounded-lg border border-brand-border/60 bg-brand-card/70 p-3">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
          {matchesMaster ? "Settings match run settings" : "Settings that differ from run settings"}
        </p>
        {!matchesMaster && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-tight">
            {visibleSettings.filter((item) => item.changed).map((item) => (
              <SummaryBit key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        )}
      </div>
      {gate ? (
        <GateSegmentDetails runId={runId} seg={seg} />
      ) : (
        <FenceSegmentDetails runId={runId} seg={seg} />
      )}
    </div>
  );
}
