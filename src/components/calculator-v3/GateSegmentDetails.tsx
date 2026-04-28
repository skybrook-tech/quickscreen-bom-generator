import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import type { SegmentDiagnostic } from "../../types/bom.types";
import { patchSegmentVariables } from "../../lib/segmentTermination";
import { Input } from "../ui/Input";
import { BOMWarningsPanel } from "./BOMWarningsPanel";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  diagnostics?: SegmentDiagnostic[];
}

export function GateSegmentDetails({ runId, seg, diagnostics = [] }: Props) {
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
    <div className="space-y-3">
      {diagnostics.length > 0 && (
        <BOMWarningsPanel
          errors={diagnostics.filter((d) => d.severity === "error").map((d) => d.message)}
          warnings={diagnostics.filter((d) => d.severity === "warning").map((d) => d.message)}
          assumptions={diagnostics.filter((d) => d.severity === "info").map((d) => d.message)}
        />
      )}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <p className="sm:col-span-2 text-brand-muted text-[11px]">
        Gate hardware (full QS_GATE form will be data-driven here later).
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-brand-muted">Hinge type</span>
        <Input
          type="text"
          value={(v["hinge_type"] as string) ?? ""}
          onChange={(e) => setScalar("hinge_type", e.target.value || null)}
          className="bg-brand-bg"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-brand-muted">Latch type</span>
        <Input
          type="text"
          value={(v["latch_type"] as string) ?? ""}
          onChange={(e) => setScalar("latch_type", e.target.value || null)}
          className="bg-brand-bg"
        />
      </label>
    </div>
    </div>
  );
}
