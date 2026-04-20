import { useMemo } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  SEGMENT_OPTION_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import { TerminationControl } from "./TerminationControl";

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function FenceSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const productCode = state.payload?.productCode ?? null;
  const { data: jobFields = [] } = useProductVariables(productCode, "job");

  const jobFieldKeys = useMemo(
    () => new Set(jobFields.map((f) => f.field_key)),
    [jobFields],
  );

  const v = seg.variables ?? {};

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
  }

  function setScalar(key: string, value: string | number | boolean | null) {
    upsertSegment(patchSegmentVariables(seg, { [key]: value }));
  }

  function onJobOverrideChange(key: string, value: string | number | boolean) {
    const base = state.payload?.variables[key];
    upsertSegment(
      patchSegmentVariables(seg, { [key]: value === base ? null : value }),
    );
  }

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...(state.payload?.variables ?? {}),
    ...v,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-brand-muted">Bay width (mm)</span>
          <input
            type="number"
            value={(v[SEGMENT_OPTION_KEYS.bayWidthMm] as number) ?? ""}
            onChange={(e) =>
              setScalar(
                SEGMENT_OPTION_KEYS.bayWidthMm,
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-brand-muted">Post type</span>
          <input
            type="text"
            value={(v[SEGMENT_OPTION_KEYS.postType] as string) ?? ""}
            onChange={(e) =>
              setScalar(SEGMENT_OPTION_KEYS.postType, e.target.value || null)
            }
            className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-brand-muted">Post width (mm)</span>
          <input
            type="number"
            value={(v[SEGMENT_OPTION_KEYS.postWidthMm] as number) ?? ""}
            onChange={(e) =>
              setScalar(
                SEGMENT_OPTION_KEYS.postWidthMm,
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
          />
        </label>
      </div>

      {jobFields.length > 0 && (
        <div>
          <p className="text-brand-muted mb-2 font-medium">
            Job settings override (this segment)
          </p>
          <SchemaDrivenForm
            fields={jobFields}
            variables={mergedJobDisplay}
            onChange={(key, value) => {
              if (!jobFieldKeys.has(key)) return;
              onJobOverrideChange(key, value);
            }}
          />
        </div>
      )}

      {(["left", "right"] as const).map((side) => (
        <TerminationControl key={side} runId={runId} seg={seg} side={side} />
      ))}
    </div>
  );
}
