import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  CORNER_DEGREE_OPTIONS,
  SEGMENT_TERMINATION_KEYS,
  patchSegmentVariables,
  type NonSystemSubtypeUi,
  type TerminationKindUi,
} from "../../lib/segmentTermination";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  side: "left" | "right";
}

export function TerminationControl({ runId, seg, side }: Props) {
  const { dispatch } = useCalculator();
  const v = seg.variables ?? {};

  const kindKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftKind
      : SEGMENT_TERMINATION_KEYS.rightKind;
  const degKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees
      : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
  const subKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype
      : SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype;

  const kind = (v[kindKey] as TerminationKindUi) ?? "";
  const sub = (v[subKey] as NonSystemSubtypeUi) ?? "wall";

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
  }

  function setKind(next: TerminationKindUi | "") {
    const patch: Record<string, string | number | boolean | null> = {
      [kindKey]: next || null,
    };
    if (next !== "corner") patch[degKey] = null;
    if (next !== "non_system_termination") patch[subKey] = null;
    if (next === "corner" && v[degKey] == null) patch[degKey] = 90;
    if (next === "non_system_termination" && v[subKey] == null)
      patch[subKey] = "wall";
    upsertSegment(patchSegmentVariables(seg, patch));
  }

  function setScalar(key: string, value: string | number | boolean | null) {
    upsertSegment(patchSegmentVariables(seg, { [key]: value }));
  }

  return (
    <div className="border border-brand-border/40 rounded-md p-3 space-y-2">
      <p className="text-brand-text font-medium capitalize">
        {side} termination
      </p>
      <label className="flex flex-col gap-1 max-w-xs">
        <span className="text-brand-muted">Type</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TerminationKindUi | "")}
          className="bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
        >
          <option value="system_post">System post</option>
          <option value="corner">Corner</option>
          <option value="non_system_termination">Non-system termination</option>
        </select>
      </label>

      {kind === "corner" && (
        <label className="flex flex-col gap-1 max-w-xs">
          <span className="text-brand-muted">Corner angle (°)</span>
          <select
            value={Number(v[degKey] ?? 90)}
            onChange={(e) => setScalar(degKey, Number(e.target.value))}
            className="bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
          >
            {CORNER_DEGREE_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}°
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === "non_system_termination" && (
        <label className="flex flex-col gap-1 max-w-xs">
          <span className="text-brand-muted">Non-system type</span>
          <select
            value={sub}
            onChange={(e) =>
              setScalar(subKey, e.target.value as NonSystemSubtypeUi)
            }
            className="bg-white border border-brand-border rounded px-3 py-2 text-sm text-brand-text"
          >
            <option value="wall">Wall</option>
            <option value="non_system_post">Non-system post</option>
          </select>
        </label>
      )}
    </div>
  );
}
