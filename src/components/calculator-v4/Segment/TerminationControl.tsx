import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import type {
  CanonicalSegment,
  SegmentTermination,
} from "../../../types/canonical.types";
import { CORNER_DEGREE_OPTIONS } from "../../../lib/segmentTermination";
import { terminationSelectOptionLabel } from "../../../lib/terminationDisplay";
import { useProducts } from "../../../hooks/useProducts";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  side: "left" | "right";
  /** When true, termination controls are disabled (segment confirmed). */
  locked?: boolean;
}

const KIND = {
  SYSTEM: "system",
  SYSTEM_CORNER: "system_corner",
  NON_SYSTEM: "non_system",
  SEGMENT_JOIN: "segment_join",
} as const;

/**
 * v4 termination control. Same logic as v3 TerminationControl but restyled
 * to match v4 design (compact form fields, lighter borders, inline labels).
 */
export function TerminationControl({
  runId,
  seg,
  side,
  locked = false,
}: Props) {
  const { dispatch } = useCalculatorV4();
  const { data: products } = useProducts();

  const termination =
    side === "left" ? seg.leftTermination : seg.rightTermination;

  if (!termination) return null;

  const allowedAngles: number[] = (() => {
    const product = products?.find((p) => p.system_type === seg.productCode);
    return product?.metadata?.allowedAngles ?? [...CORNER_DEGREE_OPTIONS];
  })();

  function patch(t: SegmentTermination) {
    const updated: CanonicalSegment =
      side === "left"
        ? { ...seg, leftTermination: t }
        : { ...seg, rightTermination: t };
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: updated });
  }

  // Read-only when canvas owns the join
  if (termination.kind === KIND.SEGMENT_JOIN) {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
          {side === "left" ? "Left" : "Right"} termination
        </label>
        <div className="px-3 py-2 rounded-[var(--brand-radius-sm)] bg-brand-border/20 border border-brand-border text-xs text-brand-muted">
          Straight join (canvas-driven)
        </div>
      </div>
    );
  }

  const kindValue =
    termination.kind === KIND.NON_SYSTEM
      ? `${KIND.NON_SYSTEM}:${termination.subtype}`
      : termination.kind;

  function handleKindChange(val: string) {
    if (val === KIND.SYSTEM) {
      patch({ kind: KIND.SYSTEM });
    } else if (val === KIND.SYSTEM_CORNER) {
      patch({ kind: KIND.SYSTEM_CORNER, angleDeg: 90 });
    } else if (val.startsWith(KIND.NON_SYSTEM + ":")) {
      const subtype = val.slice((KIND.NON_SYSTEM + ":").length) as
        | "wall"
        | "post"
        | "other";
      patch({ kind: KIND.NON_SYSTEM, subtype });
    }
  }

  const angleDeg =
    termination.kind === KIND.SYSTEM_CORNER ? termination.angleDeg : 0;
  const mag = Math.abs(angleDeg);
  const sign = Math.sign(angleDeg) || 1;

  const selectClass =
    "w-full px-3 py-2 rounded-[var(--brand-radius-sm)] bg-white border border-brand-border text-sm text-brand-text focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none";

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted">
        {side === "left" ? "Left" : "Right"} termination
      </label>
      <select
        value={kindValue}
        onChange={(e) => handleKindChange(e.target.value)}
        disabled={locked}
        className={selectClass}
      >
        <option value={KIND.SYSTEM}>
          {terminationSelectOptionLabel(KIND.SYSTEM)}
        </option>
        <option value={KIND.SYSTEM_CORNER}>
          {terminationSelectOptionLabel(KIND.SYSTEM_CORNER)}
        </option>
        <option value={KIND.NON_SYSTEM + ":wall"}>
          {terminationSelectOptionLabel(KIND.NON_SYSTEM + ":wall")}
        </option>
        <option value={KIND.NON_SYSTEM + ":post"}>
          {terminationSelectOptionLabel(KIND.NON_SYSTEM + ":post")}
        </option>
        <option value={KIND.NON_SYSTEM + ":other"}>
          {terminationSelectOptionLabel(KIND.NON_SYSTEM + ":other")}
        </option>
      </select>
      {kindValue === KIND.SYSTEM_CORNER && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="text-[10px] text-brand-muted">Angle</label>
            <select
              value={String(mag)}
              onChange={(e) =>
                patch({
                  kind: KIND.SYSTEM_CORNER,
                  angleDeg: sign * Number(e.target.value),
                })
              }
              disabled={locked}
              className={selectClass}
            >
              {allowedAngles.map((a) => (
                <option key={a} value={a}>
                  {a}°
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-brand-muted">Direction</label>
            <select
              value={sign > 0 ? "right" : "left"}
              onChange={(e) =>
                patch({
                  kind: KIND.SYSTEM_CORNER,
                  angleDeg: (e.target.value === "right" ? 1 : -1) * mag,
                })
              }
              disabled={locked}
              className={selectClass}
            >
              <option value="right">Right turn</option>
              <option value="left">Left turn</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
