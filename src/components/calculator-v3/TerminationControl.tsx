import { useCalculator } from "../../context/CalculatorContext";
import type {
  CanonicalSegment,
  SegmentTermination,
} from "../../types/canonical.types";
import { Select } from "../ui/Select";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  side: "left" | "right";
}

export function TerminationControl({ runId, seg, side }: Props) {
  const { dispatch } = useCalculator();

  const termination: SegmentTermination =
    side === "left" ? seg.leftTermination : seg.rightTermination;

  // segment_join terminations are set by the canvas adapter — not user-editable
  if (termination.kind === "segment_join") {
    return (
      <div className="border border-brand-border/40 rounded-md p-3 space-y-1">
        <p className="text-brand-text font-medium capitalize">
          {side} termination
        </p>
        <p className="text-xs text-brand-muted">
          Segment join
          {termination.angleDeg > 0 ? ` — ${termination.angleDeg}°` : " (straight)"}
        </p>
      </div>
    );
  }

  function patch(t: SegmentTermination) {
    const updated: CanonicalSegment =
      side === "left"
        ? { ...seg, leftTermination: t }
        : { ...seg, rightTermination: t };
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: updated });
  }

  const kindValue =
    termination.kind === "non_system" ? `non_system:${termination.subtype}` : "system";

  function handleKindChange(val: string) {
    if (val === "system") {
      patch({ kind: "system" });
    } else if (val.startsWith("non_system:")) {
      const subtype = val.slice("non_system:".length) as
        | "wall"
        | "post"
        | "other";
      patch({ kind: "non_system", subtype });
    }
  }

  return (
    <div className="border border-brand-border/40 rounded-md p-3 space-y-2">
      <p className="text-brand-text font-medium capitalize">
        {side} termination
      </p>
      <label className="flex flex-col gap-1 max-w-xs">
        <span className="text-brand-muted">Type</span>
        <Select value={kindValue} onChange={(e) => handleKindChange(e.target.value)}>
          <option value="system">System post</option>
          <option value="non_system:wall">Wall</option>
          <option value="non_system:post">Non-system post</option>
          <option value="non_system:other">Other (no post)</option>
        </Select>
      </label>
    </div>
  );
}
