import { useMemo } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductVariables } from "../../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../../types/canonical.types";
import type { SegmentDiagnostic } from "../../../types/bom.types";
import { patchSegmentVariables } from "../../../lib/segmentTermination";
import { BOMWarningsPanel } from "../../calculator-v3/BOMWarningsPanel";
import { SchemaDrivenFormV4 } from "../RunCard/SchemaDrivenFormV4";
import { TerminationControl } from "./TerminationControl";
import NumberInput from "../../ui/NumberInput";
import { Select } from "../../ui/Select";

const POST_SIZE_KEY = "post_size";
const POST_WIDTH_MM_KEY = "post_width_mm";

const POST_SIZE_LABELS: Record<string, string> = {
  "50": "50×50 System Post",
  "65": "65×65 HD Post",
};

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function SegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculatorV4();

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const productCode = run?.productCode ?? state.payload?.productCode ?? null;

  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  const jobFieldKeys = useMemo(
    () => new Set(jobFields.map((f) => f.field_key)),
    [jobFields],
  );

  const postSizeOptions = useMemo(() => {
    const v = runFields.find((f) => f.field_key === "post_size");
    const raw = v?.options_json ?? ["50", "65"];
    return raw.map(String);
  }, [runFields]);

  const diagnostics = useMemo(
    () =>
      (
        (state.bomResult?.segmentDiagnostics as
          | SegmentDiagnostic[]
          | undefined) ?? []
      ).filter((d) => d.segmentId === seg.segmentId),
    [state.bomResult, seg.segmentId],
  );

  const v = seg.variables ?? {};
  const postSize = (v[POST_SIZE_KEY] as string) ?? "";
  const isCustomPost = postSize === "custom";

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

  const jobMax = Number(state.payload?.variables.max_panel_width_mm ?? 2600);
  const effectiveMax = Number(v.max_panel_width_mm ?? jobMax);

  function updateMaxPanelWidth(value: number | null) {
    upsertSegment(patchSegmentVariables(seg, { max_panel_width_mm: value }));
  }

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...(state.payload?.variables ?? {}),
    ...v,
  };

  const labelClass =
    "block text-[11px] font-medium uppercase tracking-wider text-neutral-500";

  const isFence = seg.kind === "fence";

  return (
    <div className="p-3 bg-white space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={labelClass}>Length (m)</label>
          <div className="relative">
            <NumberInput
              value={(seg.segmentWidthMm ?? 0) / 1000}
              step={0.1}
              onChange={(value) =>
                upsertSegment({
                  ...seg,
                  segmentWidthMm: Math.max(0, value * 1000),
                })
              }
              className="pr-8"
              data-testid={`v4-seg-length-${seg.segmentId}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
              m
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Height (mm)</label>
          <div className="relative">
            <NumberInput
              value={seg.targetHeightMm ?? 0}
              onChange={(value) =>
                upsertSegment({
                  ...seg,
                  targetHeightMm: Math.max(0, value),
                })
              }
              className="pr-10"
              data-testid={`v4-seg-height-${seg.segmentId}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
              mm
            </span>
          </div>
        </div>
      </div>

      {isFence && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">
              Max panel width (mm)
            </span>
            <NumberInput
              value={effectiveMax}
              onChange={(val) => updateMaxPanelWidth(val)}
              min={300}
              max={2600}
              step={50}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Post type</span>
            <Select
              value={postSize}
              onChange={(e) => setScalar(POST_SIZE_KEY, e.target.value || null)}
              className="bg-white border border-neutral-200 rounded-md"
            >
              <option value="">— Job default —</option>
              {postSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {POST_SIZE_LABELS[opt] ?? `${opt}mm Post`}
                </option>
              ))}
              <option value="custom">(Non-system post)</option>
            </Select>
          </label>

          {isCustomPost && (
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-neutral-500 text-xs">Post width (mm)</span>
              <NumberInput
                value={(v[POST_WIDTH_MM_KEY] as number | null) ?? null}
                onChange={(val) => setScalar(POST_WIDTH_MM_KEY, val)}
                min={1}
              />
            </label>
          )}
        </div>
      )}

      {isFence && jobFields.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mb-2 font-medium">
            Job settings override (this segment)
          </p>
          <SchemaDrivenFormV4
            fields={jobFields}
            variables={mergedJobDisplay}
            onChange={(key, value) => {
              if (!jobFieldKeys.has(key)) return;
              onJobOverrideChange(key, value);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TerminationControl runId={runId} seg={seg} side="left" />
        <TerminationControl runId={runId} seg={seg} side="right" />
      </div>
    </div>
  );
}
