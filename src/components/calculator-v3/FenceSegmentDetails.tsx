import { useMemo } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../types/canonical.types";
import type { SegmentDiagnostic } from "../../types/bom.types";
import { patchSegmentVariables } from "../../lib/segmentTermination";
import { BOMWarningsPanel } from "./BOMWarningsPanel";

const POST_SIZE_KEY = "post_size";
const POST_WIDTH_MM_KEY = "post_width_mm";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import { TerminationControl } from "./TerminationControl";
import NumberInput from "../ui/NumberInput";
import { Select } from "../ui/Select";

const POST_SIZE_LABELS: Record<string, string> = {
  "50": "50×50 System Post",
  "65": "65×65 HD Post",
};

interface Props {
  runId: string;
  seg: CanonicalSegment;
  diagnostics?: SegmentDiagnostic[];
}

export function FenceSegmentDetails({ runId, seg, diagnostics = [] }: Props) {
  const { state, dispatch } = useCalculator();
  const productCode = state.payload?.productCode ?? null;
  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  const jobFieldKeys = useMemo(
    () => new Set(jobFields.map((f) => f.field_key)),
    [jobFields],
  );

  // Post size options from the run-scoped post_size variable
  const postSizeOptions = useMemo(() => {
    const v = runFields.find((f) => f.field_key === "post_size");
    const raw = v?.options_json ?? ["50", "65"];
    return raw.map(String);
  }, [runFields]);

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

  return (
    <div className="space-y-4">
      {diagnostics.length > 0 && (
        <BOMWarningsPanel
          errors={diagnostics.filter((d) => d.severity === "error").map((d) => d.message)}
          warnings={diagnostics.filter((d) => d.severity === "warning").map((d) => d.message)}
          assumptions={diagnostics.filter((d) => d.severity === "info").map((d) => d.message)}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Max panel width override */}
        <label className="flex flex-col gap-1">
          <span className="text-brand-muted text-xs">Max panel width (mm)</span>
          <NumberInput
            value={effectiveMax}
            onChange={(v) => updateMaxPanelWidth(v)}
            min={300}
            max={2600}
            step={50}
          />
        </label>

        {/* Post type — data-driven from run-scoped post_size variable */}
        <label className="flex flex-col gap-1">
          <span className="text-brand-muted text-xs">Post type</span>
          <Select
            value={postSize}
            onChange={(e) =>
              setScalar(POST_SIZE_KEY, e.target.value || null)
            }
            className="bg-brand-bg"
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

        {/* Post width — only unlocked for non-system posts */}
        {isCustomPost && (
          <label className="flex flex-col gap-1">
            <span className="text-brand-muted text-xs">Post width (mm)</span>
            <NumberInput
              value={
                (v[POST_WIDTH_MM_KEY] as number | null) ?? null
              }
              onChange={(val) =>
                setScalar(POST_WIDTH_MM_KEY, val)
              }
              min={1}
            />
          </label>
        )}
      </div>

      {jobFields.length > 0 && (
        <div>
          <p className="text-xs text-brand-muted mb-2 font-medium">
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

      <div className="grid grid-cols-2 gap-3">
        {(["left", "right"] as const).map((side) => (
          <TerminationControl key={side} runId={runId} seg={seg} side={side} />
        ))}
      </div>
    </div>
  );
}
