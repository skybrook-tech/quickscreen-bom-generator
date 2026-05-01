import { useEffect, useMemo, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import type { CanonicalSegment } from "../../../types/canonical.types";
import {
  buildPitchLadderHeightOptions,
  isFreeformHeightUi,
  parseTargetHeightUi,
  snapHeightToClosestPitchOption,
} from "../../../lib/targetHeightOptions";
import { SegmentDetails } from "./SegmentDetails";
import { SegmentHeader } from "./SegmentHeader";
import { cn } from "../../../lib";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  index: number;
}

export function SegmentRow({ runId, seg, index }: Props) {
  const { dispatch, state } = useCalculatorV4();
  const [open, setOpen] = useState(false);
  const { data: products = [] } = useProducts();

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const productCode = run?.productCode ?? state.payload?.productCode ?? null;

  const mergedVars = useMemo(() => {
    return {
      ...(state.payload?.variables ?? {}),
      ...(run?.variables ?? {}),
      ...(seg.variables ?? {}),
    };
  }, [state.payload?.variables, run?.variables, seg.variables]);

  const heightMeta = useMemo(
    () =>
      parseTargetHeightUi(
        products.find((p) => p.system_type === productCode)?.metadata,
      ),
    [products, productCode],
  );

  const pitchLadderOptions = useMemo(() => {
    if (isFreeformHeightUi(heightMeta)) return [];
    return buildPitchLadderHeightOptions(mergedVars, heightMeta);
  }, [heightMeta, mergedVars]);

  useEffect(() => {
    if (isFreeformHeightUi(heightMeta) || pitchLadderOptions.length === 0)
      return;

    const cur = seg.targetHeightMm;
    if (cur != null && pitchLadderOptions.includes(cur)) return;

    const snapped = snapHeightToClosestPitchOption(cur, pitchLadderOptions);
    if (snapped === null || snapped === cur) return;

    dispatch({
      type: "UPSERT_SEGMENT",
      runId,
      segment: { ...seg, targetHeightMm: snapped },
    });
  }, [dispatch, heightMeta, pitchLadderOptions, runId, seg]);

  return (
    <div
      className={cn("rounded-lg border overflow-hidden transition-colors", {
        "border-brand-border bg-brand-card": open,
        "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20":
          seg.kind === "fence",
        "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20":
          seg.kind === "gate",
      })}
      data-testid={`v4-segment-row-${seg.segmentId}`}
    >
      <SegmentHeader
        runId={runId}
        seg={seg}
        index={index}
        open={open}
        mergedVars={mergedVars}
        productCode={productCode}
        onToggle={() => setOpen((o) => !o)}
        onLengthChange={(lengthMm) =>
          dispatch({
            type: "UPSERT_SEGMENT",
            runId,
            segment: { ...seg, segmentWidthMm: lengthMm },
          })
        }
        onHeightChange={(heightMm) =>
          dispatch({
            type: "UPSERT_SEGMENT",
            runId,
            segment: { ...seg, targetHeightMm: heightMm },
          })
        }
        onDuplicate={() =>
          dispatch({
            type: "DUPLICATE_SEGMENT",
            runId,
            segmentId: seg.segmentId,
          })
        }
        onRemove={() =>
          dispatch({
            type: "REMOVE_SEGMENT",
            runId,
            segmentId: seg.segmentId,
          })
        }
      />
      {open && (
        <SegmentDetails
          runId={runId}
          seg={seg}
          locked={seg.confirmed === true}
        />
      )}
    </div>
  );
}
