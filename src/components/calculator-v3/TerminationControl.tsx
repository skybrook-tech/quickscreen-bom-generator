import { useCalculator } from "../../context/CalculatorContext";
import type {
  CanonicalSegment,
  SegmentTermination,
} from "../../types/canonical.types";
import { CORNER_DEGREE_OPTIONS } from "../../lib/segmentTermination";
import { useProducts } from "../../hooks/useProducts";
import { Select } from "../ui/Select";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  side: "left" | "right";
}

enum KINDS {
  SYSTEM = "system",
  SYSTEM_CORNER = "system_corner",
  NON_SYSTEM = "non_system",
  SEGMENT_JOIN = "segment_join",
}

enum KIND_SUBTYPES {
  WALL = "wall",
  POST = "post",
  OTHER = "other",
}

export function TerminationControl({ runId, seg, side }: Props) {
  const { dispatch } = useCalculator();
  const { data: products } = useProducts();

  const termination: SegmentTermination =
    side === "left" ? seg.leftTermination : seg.rightTermination;

  console.log(termination);
  console.log(side);
  console.log(seg);

  // Resolve allowedAngles for this segment's product
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

  // segment_join = straight-through join, canvas-driven, read-only
  if (termination.kind === KINDS.SEGMENT_JOIN) {
    return (
      <div className="border border-brand-border/40 rounded-md p-3 space-y-1">
        <p className="text-brand-text font-medium capitalize">
          {side} termination
        </p>
        <p className="text-xs text-brand-muted">Straight join</p>
      </div>
    );
  }

  const kindValue =
    termination.kind === KINDS.NON_SYSTEM
      ? `${KINDS.NON_SYSTEM}:${termination.subtype}`
      : termination.kind;

  function handleKindChange(val: string) {
    if (val === KINDS.SYSTEM) {
      patch({ kind: KINDS.SYSTEM });
    } else if (val === KINDS.SYSTEM_CORNER) {
      patch({ kind: KINDS.SYSTEM_CORNER, angleDeg: 90 });
    } else if (val.startsWith(KINDS.NON_SYSTEM + ":")) {
      const subtype = val.slice((KINDS.NON_SYSTEM + ":").length) as
        | KIND_SUBTYPES.WALL
        | KIND_SUBTYPES.POST
        | KIND_SUBTYPES.OTHER;
      patch({ kind: KINDS.NON_SYSTEM, subtype });
    }
  }

  const angleDeg =
    termination.kind === KINDS.SYSTEM_CORNER ? termination.angleDeg : 0;
  const mag = Math.abs(angleDeg);
  const sign = Math.sign(angleDeg) || 1;

  return (
    <div className="border border-brand-border/40 rounded-md p-3 space-y-2">
      <div>
        <p className="text-brand-text font-medium capitalize">
          {side} termination
        </p>
        <label className="flex flex-col gap-1 max-w-xs">
          <span className="text-brand-muted">Type</span>
          <Select
            value={kindValue}
            onChange={(e) => handleKindChange(e.target.value)}
          >
            <option value={KINDS.SYSTEM}>System post</option>
            <option value={KINDS.SYSTEM_CORNER}>System corner</option>
            <option value={KINDS.NON_SYSTEM + ":" + KIND_SUBTYPES.WALL}>
              Wall
            </option>
            <option value={KINDS.NON_SYSTEM + ":" + KIND_SUBTYPES.POST}>
              Non-system post
            </option>
            <option value={KINDS.NON_SYSTEM + ":" + KIND_SUBTYPES.OTHER}>
              Other (no post)
            </option>
          </Select>
        </label>
      </div>
      {kindValue === KINDS.SYSTEM_CORNER && (
        <div className="">
          <div className="flex gap-3 items-end flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="text-brand-muted text-xs">Angle</span>
              <Select
                value={String(mag)}
                onChange={(e) =>
                  patch({
                    kind: KINDS.SYSTEM_CORNER,
                    angleDeg: sign * Number(e.target.value),
                  })
                }
              >
                {allowedAngles.map((a) => (
                  <option key={a} value={a}>
                    {a}°
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-brand-muted text-xs">Direction</span>
              <Select
                value={sign > 0 ? "right" : "left"}
                onChange={(e) =>
                  patch({
                    kind: KINDS.SYSTEM_CORNER,
                    angleDeg: (e.target.value === "right" ? 1 : -1) * mag,
                  })
                }
              >
                <option value="right">Right turn</option>
                <option value="left">Left turn</option>
              </Select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
