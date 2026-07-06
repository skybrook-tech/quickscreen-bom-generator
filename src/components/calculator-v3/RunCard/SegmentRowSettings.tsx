import { X } from "lucide-react";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { gateTypeLabel, validateGateWidth } from "../../../lib/gateConstraints";
import NumberInput from "../../shared/NumberInput";
import { SegmentSummary, type DiffCtx } from "./segmentSummary";
import { FenceSegmentDetails } from "./FenceSegmentDetails";
import { GateSegmentDetails } from "./GateSegmentDetails";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  isPanelStrategy: boolean;
  gate: boolean;
  gateWidthValidation: ReturnType<typeof validateGateWidth> | null;
  matchesMaster: boolean;
  summaryCtx: DiffCtx;
  showRunDefaultsTeaching: boolean;
  onDismissRunDefaultsTeaching?: () => void;
  updatePanelQuantity: (value: number) => void;
  switchGateToAlternative: () => void;
}

export function SegmentRowSettings({
  runId,
  seg,
  isPanelStrategy,
  gate,
  gateWidthValidation,
  matchesMaster,
  summaryCtx,
  showRunDefaultsTeaching,
  onDismissRunDefaultsTeaching,
  updatePanelQuantity,
  switchGateToAlternative,
}: Props) {
  return (
    <div className="space-y-4 border-brand-border/50 bg-brand-bg/50 p-3 pt-0">
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
      {isPanelStrategy && !gate && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
      )}
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
      <SegmentSummary mode="chips" ctx={summaryCtx} matchesMaster={matchesMaster} />

      {gate ? (
        <GateSegmentDetails runId={runId} seg={seg} />
      ) : (
        <FenceSegmentDetails runId={runId} seg={seg} />
      )}
    </div>
  );
}
