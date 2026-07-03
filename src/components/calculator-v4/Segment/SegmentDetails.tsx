import { useMemo } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductVariables } from "../../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../../types/canonical.types";
import { patchSegmentVariables } from "../../../lib/segmentTermination";
import { useSegmentHeightOptions } from "../../../hooks/useSegmentHeightOptions";
import { SchemaDrivenFormV4 } from "../RunCard/SchemaDrivenFormV4";
import { TerminationControl } from "./TerminationControl";
import NumberInput from "../../ui/NumberInput";
import { cn } from "../../../lib";
import { ProductSelectV4 } from "../JobShell/ProductSelectV4";
import { GateSegmentDetails } from "./GateSegmentDetails";

interface Props {
  runId: string;
  seg: CanonicalSegment;
  locked?: boolean;
  isMaster: boolean;
}

export function SegmentDetails({ runId, seg, locked = false, isMaster }: Props) {
  const { state, dispatch } = useCalculatorV4();

  const run = state.payload?.runs.find((r) => r.runId === runId);
  const productCode = run?.productCode ?? state.payload?.productCode ?? null;

  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  useProductVariables(productCode, "run");

  const jobFieldKeys = useMemo(
    () => new Set(jobFields.map((f) => f.field_key)),
    [jobFields],
  );

  const mergedForHeights = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run?.variables ?? {}),
      ...(seg.variables ?? {}),
    }),
    [state.payload?.variables, run?.variables, seg.variables],
  );

  useSegmentHeightOptions(productCode, mergedForHeights, seg.targetHeightMm);

  const v = seg.variables ?? {};

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
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

  const labelClass =
    "block text-[11px] font-medium uppercase tracking-wider text-brand-muted";

  const isFence = seg.kind === "fence";

  if (seg.kind === "gate") {
    return <GateSegmentDetails runId={runId} seg={seg} locked={locked} />;
  }

  return null;
  return (
    <div
      className={cn(
        "p-3 bg-white dark:bg-brand-card space-y-4",
        locked && "opacity-60 pointer-events-none",
      )}
      aria-disabled={locked}
    > {
        isMaster && (<ProductSelectV4
          value={
            state.payload?.runs.find((r) => r.runId === runId)
              ?.productCode ??
            state.payload?.productCode ??
            ""
          }
          onChange={(code) =>
            dispatch({
              type: "SET_RUN_PRODUCT",
              runId,
              productCode: code,
            })
          }
        />)
      }

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
              disabled={locked}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-muted pointer-events-none">
              m
            </span>
          </div>
        </div>
        {/* <div className="space-y-2">
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
              data-testid={`v4-seg-height-${seg.segmentId}`}
            >
              {heightOptionsMm.map((h) => (
                <option key={h} value={h}>
                  {h} mm
                </option>
              ))}
            </Select>
          )}
        </div> */}
      </div>

      {/* {isFence && slatSizeOptions.length > 1 && (
        <div className="space-y-2">
          <label className={labelClass}>Slat size</label>
          <Segmented
            value={String(v.slat_size_mm ?? state.payload?.variables.slat_size_mm ?? slatSizeOptions[0] ?? "65")}
            onChange={(val) => setScalar("slat_size_mm", val)}
            options={slatSizeOptions.map((o) => ({ value: o, label: `${o}mm` }))}
            size="sm"
          />
        </div>
      )} */}

      {/* {isFence && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-brand-muted text-xs">
              Post spacing (mm)
            </span>

            <NumberInput
              value={effectiveMax}
              onChange={(val) => updateMaxPanelWidth(val)}
              min={300}
              max={2600}
              step={50}
              disabled={locked}
            />
            <span className="text-[10px] text-brand-muted -mt-0.5 mb-0.5">
              Maximum bay width — drives spacing between posts along the run.
            </span>
            {lenMm > 0 && actualPostSpacingMm > 0 ? (
              <span className="text-[10px] text-brand-muted mt-1">
                Actual spacing this segment: ~{actualPostSpacingMm} mm (
                {panelsForSpacing} bay{panelsForSpacing === 1 ? "" : "s"})
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-brand-muted text-xs">Post type</span>
            <Select
              value={postSize}
              onChange={(e) => setScalar(POST_SIZE_KEY, e.target.value || null)}
              disabled={locked}
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
              <span className="text-brand-muted text-xs">Post width (mm)</span>
              <NumberInput
                value={(v[POST_WIDTH_MM_KEY] as number | null) ?? null}
                onChange={(val) => setScalar(POST_WIDTH_MM_KEY, val)}
                min={1}
                disabled={locked}
              />
            </label>
          )}
        </div>
      )} */}

      {/* {isFence && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={labelClass}>Post colour</span>
            <label className="flex items-center gap-1.5 text-xs text-brand-muted cursor-pointer">
              <input
                type="checkbox"
                disabled={locked}
                checked={!!v[POST_COLOUR_KEY]}
                onChange={(e) => {
                  const jobColour = String(state.payload?.variables.colour_code ?? "black-satin");
                  setScalar(POST_COLOUR_KEY, e.target.checked ? jobColour : null);
                }}
              />
              Custom
            </label>
          </div>
          {v[POST_COLOUR_KEY] ? (
            <ColourSwatches
              value={String(v[POST_COLOUR_KEY])}
              onChange={(val) => setScalar(POST_COLOUR_KEY, val)}
              colours={COLOUR_OPTIONS}
            />
          ) : (
            <p className="text-xs text-brand-muted">
              Matching fence colour —{" "}
              <span className="text-brand-text">
                {COLOUR_OPTIONS.find(
                  (o) => o.value === String(state.payload?.variables.colour_code ?? ""),
                )?.label ?? String(state.payload?.variables.colour_code ?? "—")}
              </span>
            </p>
          )}
        </div>
      )} */}

      {isFence && jobFields.length > 0 && (
        <fieldset disabled={locked} className="min-w-0 border-0 p-0 m-0">
          <legend className="text-xs text-brand-muted mb-2 font-medium">
            Job settings override (this segment)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TerminationControl runId={runId} seg={seg} side="left" locked={locked} />
        <TerminationControl runId={runId} seg={seg} side="right" locked={locked} />
      </div>
    </div>
  );
}
