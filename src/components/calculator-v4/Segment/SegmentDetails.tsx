import { useMemo } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductVariables } from "../../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { patchSegmentVariables } from "../../../lib/segmentTermination";
import { useSegmentHeightOptions } from "../../../hooks/useSegmentHeightOptions";
import { SchemaDrivenFormV4 } from "../RunCard/SchemaDrivenFormV4";
import { TerminationControl } from "./TerminationControl";
import NumberInput from "../../ui/NumberInput";
import { Select } from "../../ui/Select";
import { cn } from "../../../lib";
import { ProductSelectV4 } from "../JobShell/ProductSelectV4";
import {
  POST_TYPE_LABELS,
  postTypeOptionsForSystem,
} from "../../../lib/productOptionRules";

const POST_SIZE_KEY = "post_size";
const POST_WIDTH_MM_KEY = "post_width_mm";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  locked?: boolean;
  isBayg?: boolean;
}

export function SegmentDetails({
  runId,
  seg,
  locked = false,
  isBayg = false,
}: Props) {
  const { state, dispatch } = useCalculatorV4();

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? null;
  const productCode = seg.productCode || runProductCode;
  const hasSystemOverride =
    Boolean(runProductCode) && Boolean(seg.productCode) && seg.productCode !== runProductCode;

  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  const jobFieldKeys = useMemo(
    () => new Set(jobFields.map((f) => f.field_key)),
    [jobFields],
  );

  const postSizeOptions = useMemo(() => {
    const v = runFields.find((f) => f.field_key === "post_size");
    const raw = v?.options_json ?? ["50", "65"];
    return postTypeOptionsForSystem(productCode, raw.map(String));
  }, [productCode, runFields]);

  const mergedForHeights = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run?.variables ?? {}),
      ...(seg.variables ?? {}),
    }),
    [state.payload?.variables, run?.variables, seg.variables],
  );

  const {
    freeform,
    freeformBounds,
    optionsMm: heightOptionsMm,
    clampFreeform,
  } = useSegmentHeightOptions(
    productCode,
    mergedForHeights,
    seg.targetHeightMm,
  );

  const heightSelectValue = String(
    seg.targetHeightMm ??
      heightOptionsMm[0] ??
      freeformBounds?.minMm ??
      1800,
  );

  const freeformHeightValue =
    seg.targetHeightMm ?? freeformBounds?.minMm ?? 300;

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

  function updateSegmentProduct(code: string) {
    upsertSegment({ ...seg, productCode: code });
  }

  function clearSegmentProductOverride() {
    if (!runProductCode) return;
    upsertSegment({ ...seg, productCode: runProductCode });
  }

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...(state.payload?.variables ?? {}),
    ...v,
  };

  const labelClass =
    "block text-[11px] font-medium uppercase tracking-wider text-neutral-500";

  const isFence = seg.kind === "fence";

  const lenMm = seg.segmentWidthMm ?? 0;
  const panelsForSpacing =
    effectiveMax > 0 && lenMm > 0
      ? Math.max(1, Math.ceil(lenMm / effectiveMax))
      : 1;
  const actualPostSpacingMm =
    panelsForSpacing > 0 ? Math.round(lenMm / panelsForSpacing) : 0;

  return (
    <div
      className={cn(
        "p-3 bg-white space-y-4",
        locked && "opacity-60 pointer-events-none",
      )}
      aria-disabled={locked}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={labelClass}>
            {isBayg ? "Panel width (mm)" : "Length (m)"}
          </label>
          <div className="relative">
            <NumberInput
              value={isBayg ? (seg.segmentWidthMm ?? 0) : (seg.segmentWidthMm ?? 0) / 1000}
              min={0}
              max={isBayg ? 2600 : undefined}
              step={isBayg ? 1 : 0.1}
              onChange={(value) =>
                upsertSegment({
                  ...seg,
                  segmentWidthMm: Math.max(0, isBayg ? value : value * 1000),
                })
              }
              className="pr-8"
              data-testid={`v4-seg-length-${seg.segmentId}`}
              disabled={locked}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
              {isBayg ? "mm" : "m"}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Height (mm)</label>
          {freeform && freeformBounds ? (
            <div data-testid={`v4-seg-height-${seg.segmentId}`}>
              <NumberInput
                value={freeformHeightValue}
                min={freeformBounds.minMm}
                max={freeformBounds.maxMm}
                step={1}
                onChange={(v) =>
                  upsertSegment({
                    ...seg,
                    targetHeightMm: clampFreeform(v),
                  })
                }
                disabled={locked}
                className="bg-white border border-neutral-200 rounded-md"
              />
            </div>
          ) : (
            <Select
              value={heightSelectValue}
              onChange={(e) =>
                upsertSegment({
                  ...seg,
                  targetHeightMm: Number(e.target.value),
                })
              }
              disabled={locked}
              className="bg-white border border-neutral-200 rounded-md"
              data-testid={`v4-seg-height-${seg.segmentId}`}
            >
              {heightOptionsMm.map((h) => (
                <option key={h} value={h}>
                  {h} mm
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {isFence && !isBayg && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2 rounded-lg border border-brand-border/70 bg-brand-bg/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Segment system
                  </span>
                  <span className="rounded-full border border-brand-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                    Override
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Leave this matching the run default unless this segment uses a different fence system.
                </p>
              </div>
              {hasSystemOverride && (
                <button
                  type="button"
                  onClick={clearSegmentProductOverride}
                  disabled={locked}
                  className="text-xs font-medium text-brand-accent hover:underline disabled:opacity-40"
                >
                  Match run default
                </button>
              )}
            </div>
            <ProductSelectV4
              value={productCode ?? ""}
              onChange={updateSegmentProduct}
              separated
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">
              Post spacing (mm)
            </span>
            <span className="text-[10px] text-neutral-400 -mt-0.5 mb-0.5">
              Maximum bay width — drives spacing between posts along the run.
            </span>
            <NumberInput
              value={effectiveMax}
              onChange={(val) => updateMaxPanelWidth(val)}
              min={300}
              max={2600}
              step={50}
              disabled={locked}
            />
            {lenMm > 0 && actualPostSpacingMm > 0 ? (
              <span className="text-[10px] text-neutral-500 mt-1">
                Actual spacing this segment: ~{actualPostSpacingMm} mm (
                {panelsForSpacing} bay{panelsForSpacing === 1 ? "" : "s"})
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs">Post Type</span>
            <Select
              value={postSize}
              onChange={(e) => setScalar(POST_SIZE_KEY, e.target.value || null)}
              disabled={locked}
              className="bg-white border border-neutral-200 rounded-md"
            >
              <option value="">— Job default —</option>
              {postSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {POST_TYPE_LABELS[opt] ?? `${opt}mm Post`}
                </option>
              ))}
              {!postSizeOptions.includes("custom") && (
                <option value="custom">{POST_TYPE_LABELS.custom}</option>
              )}
            </Select>
          </label>

          {isCustomPost && (
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-neutral-500 text-xs">Post width (mm)</span>
              <NumberInput
                value={(v[POST_WIDTH_MM_KEY] as number | null) ?? null}
                onChange={(val) => setScalar(POST_WIDTH_MM_KEY, val)}
                min={1}
                disabled={locked}
              />
            </label>
          )}
        </div>
      )}

      {isFence && jobFields.length > 0 && (
        <fieldset disabled={locked} className="min-w-0 border-0 p-0 m-0">
          <legend className="text-xs text-neutral-500 mb-2 font-medium">
            {isBayg
              ? "Panel settings override"
              : "Job settings override (this segment)"}
          </legend>
          <SchemaDrivenFormV4
            fields={jobFields}
            variables={mergedJobDisplay}
            onChange={(key, value) => {
              if (!jobFieldKeys.has(key)) return;
              onJobOverrideChange(key, value);
            }}
          />
        </fieldset>
      )}

      {!isBayg && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TerminationControl
            runId={runId}
            seg={seg}
            side="left"
            locked={locked}
          />
          <TerminationControl
            runId={runId}
            seg={seg}
            side="right"
            locked={locked}
          />
        </div>
      )}
    </div>
  );
}
