import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../lib";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import type { CanonicalSegment } from "../../../types/canonical.types";
import {
  CANVAS_GATE_STROKE,
  RUN_LINE_COLORS,
  hexWithAlpha,
} from "../../../lib/runLineColors";
import {
  buildPitchLadderHeightOptions,
  isFreeformHeightUi,
  parseTargetHeightUi,
  snapHeightToClosestPitchOption,
} from "../../../lib/targetHeightOptions";
import { useLayoutSegmentHighlight } from "../LayoutMap/LayoutSegmentHighlightContext";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { buildCollapsedSegmentSpecs } from "../../../lib/segmentCollapsedSpecs";
import { SegmentCollapsedSpecRow } from "./SegmentCollapsedSpecRow";
import { SegmentDetails } from "./SegmentDetails";
import { SegmentHeader } from "./SegmentHeader";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  /** e.g. S1, S2 for fence spans; G1 for gates (ordinals per kind). */
  segmentLabel: string;
  /** 0-based — matches canvas run stroke palette */
  runColorIndex: number;
  /** Whether this is the master segment for the run (only one per run). */
  isMaster: boolean;
}

export function SegmentRow({ runId, seg, segmentLabel, runColorIndex, isMaster }: Props) {
  const layoutHl = useLayoutSegmentHighlight();
  const { dispatch, state } = useCalculatorV4();
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pending = layoutHl?.pendingOpenSegment;
    if (
      !pending ||
      pending.runId !== runId ||
      pending.segmentId !== seg.segmentId
    ) {
      return;
    }
    setOpen(true);
    layoutHl.consumePendingOpen();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [layoutHl, layoutHl?.pendingOpenSegment, runId, seg.segmentId]);
  const { data: products = [] } = useProducts();
  const run = state.payload?.runs.find((r) => r.runId === runId);
  const productCode = run?.productCode ?? state.payload?.productCode ?? null;

  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: segmentFields = [] } = useProductVariables(
    productCode,
    "segment",
  );

  const fenceAccentHex =
    RUN_LINE_COLORS[runColorIndex % RUN_LINE_COLORS.length] ??
    RUN_LINE_COLORS[0];

  const fenceSegmentCount =
    run?.segments.filter((s) => s.kind === "fence").length ?? 0;
  const removeMasterFenceDisabled =
    seg.kind === "fence" && fenceSegmentCount <= 1;

  const mergedVars = useMemo(() => {
    return {
      ...(state.payload?.variables ?? {}),
      ...(run?.variables ?? {}),
      ...(seg.variables ?? {}),
    };
  }, [state.payload?.variables, run?.variables, seg.variables]);

  const metaForProduct = useMemo(
    () => products.find((p) => p.system_type === productCode)?.metadata,
    [products, productCode],
  );

  const collapsedSpecs = useMemo(
    () =>
      buildCollapsedSegmentSpecs(
        state.payload ?? null,
        run,
        seg,
        jobFields,
        segmentFields,
      ),
    [state.payload, run, seg, jobFields, segmentFields],
  );

  const heightMeta = useMemo(
    () => parseTargetHeightUi(metaForProduct),
    [metaForProduct],
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

  const rowStyle =
    seg.kind === "fence"
      ? {
          borderColor: fenceAccentHex,
          backgroundColor: open
            ? hexWithAlpha(fenceAccentHex, 0.12)
            : hexWithAlpha(fenceAccentHex, 0.06),
        }
      : {
          borderColor: CANVAS_GATE_STROKE,
          backgroundColor: open
            ? "rgba(245, 158, 11, 0.12)"
            : "rgba(245, 158, 11, 0.06)",
        };

  const isLayoutLinkedHighlight =
    !!layoutHl &&
    seg.kind === "fence" &&
    layoutHl.highlight?.runId === runId &&
    layoutHl.highlight?.segmentId === seg.segmentId;

  return (
    <div
      ref={rowRef}
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-colors",
        isLayoutLinkedHighlight &&
          "ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-card",
      )}
      style={rowStyle}
      data-testid={`v4-segment-row-${seg.segmentId}`}
      onMouseEnter={() => {
        if (layoutHl && seg.kind === "fence") {
          layoutHl.setHighlight({ runId, segmentId: seg.segmentId });
        }
      }}
      onMouseLeave={() => {
        if (layoutHl && seg.kind === "fence") {
          layoutHl.setHighlight(null);
        }
      }}
    >
      <SegmentHeader
        runId={runId}
        seg={seg}
        segmentLabel={segmentLabel}
        open={open}
        removeDisabled={removeMasterFenceDisabled}
        mergedVars={mergedVars}
        productCode={productCode}
        fenceAccentHex={fenceAccentHex}
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
          isMaster={isMaster}
        />
      )}
    </div>
  );
}
