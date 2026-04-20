import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  GATE_SEGMENT_STUB_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function GateSegmentDetails({ runId, seg }: Props) {
  const { dispatch } = useCalculator();
  const v = seg.variables ?? {};

  function setScalar(key: string, value: string | null) {
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, { [key]: value }),
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <p className="sm:col-span-2 text-brand-muted text-[11px]">
        Gate hardware (full QS_GATE form will be data-driven here later).
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-brand-muted">Hinge type</span>
        <input
          type="text"
          value={(v[GATE_SEGMENT_STUB_KEYS.hingeType] as string) ?? ""}
          onChange={(e) =>
            setScalar(GATE_SEGMENT_STUB_KEYS.hingeType, e.target.value || null)
          }
          className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-brand-muted">Latch type</span>
        <input
          type="text"
          value={(v[GATE_SEGMENT_STUB_KEYS.latchType] as string) ?? ""}
          onChange={(e) =>
            setScalar(GATE_SEGMENT_STUB_KEYS.latchType, e.target.value || null)
          }
          className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
        />
      </label>
    </div>
  );
}
