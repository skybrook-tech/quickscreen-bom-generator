import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  SEGMENT_TERMINATION_KEYS,
  patchSegmentVariables,
  type NonSystemSubtypeUi,
} from "../../lib/segmentTermination";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  side: "left" | "right";
  readOnly?: boolean;
}

const END_OPTIONS = [
  { value: "post", label: "Post" },
  { value: "wall", label: "Wall" },
  { value: "pillar", label: "Pillar" },
  { value: "void", label: "Void" },
] as const;

type EndCondition = (typeof END_OPTIONS)[number]["value"];

export function TerminationControl({ runId, seg, side, readOnly = false }: Props) {
  const { dispatch } = useCalculator();
  const v = seg.variables ?? {};
  const kindKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftKind
      : SEGMENT_TERMINATION_KEYS.rightKind;
  const subKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype
      : SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype;

  const kind = String(v[kindKey] ?? "system_post");
  const sub = (v[subKey] as NonSystemSubtypeUi) ?? "wall";
  const selected: EndCondition =
    kind === "non_system_termination"
      ? sub === "pillar" || sub === "void"
        ? sub
        : "wall"
      : "post";

  function setCondition(next: EndCondition) {
    if (readOnly) return;
    const patch =
      next === "post"
        ? { [kindKey]: "system_post", [subKey]: null }
        : {
            [kindKey]: "non_system_termination",
            [subKey]: next,
          };
    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: patchSegmentVariables(seg, patch),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold capitalize text-brand-muted">{side} end</p>
        {readOnly && (
          <span className="rounded-full border border-brand-border bg-brand-card px-2 py-0.5 text-[11px] font-bold text-brand-muted">
            Shared with adjacent section
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {END_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={readOnly}
            onClick={() => setCondition(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors disabled:cursor-not-allowed ${
              selected === option.value
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary disabled:hover:border-brand-border disabled:hover:text-brand-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
