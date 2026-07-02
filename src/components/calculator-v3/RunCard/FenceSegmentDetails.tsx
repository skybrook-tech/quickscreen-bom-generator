import { useEffect, useMemo, useState } from "react";
import { useCalculator } from "../../../context/CalculatorContext";
import { useCalculatorConfig } from "../../../hooks/useCalculatorConfig";
import type { CanonicalSegment } from "../../../types/canonical.types";
import {
  clampPostSpacing,
  MAX_POST_SPACING_MM,
  MIN_POST_SPACING_MM,
} from "../../../lib/productOptionRules";
import {
  SEGMENT_OPTION_KEYS,
  patchSegmentVariables,
} from "../../../lib/segmentTermination";
import { SchemaDrivenForm, valueLabel, type SchemaField } from "../SchemaDrivenForm";
import NumberInput from "../../shared/NumberInput";
import { SettingsDisclosureRow } from "../SettingsDisclosureRow";
import { colourName } from "../ColourPalette";
import { combinedGapLabel, normaliseGapModeConfig } from "../../../lib/gapChoices";
import { useFenceProducts } from "../../../hooks/useProducts";
import { localFenceProducts } from "../../../lib/localSeedData";
import { isPanelStrategyCode } from "../../../lib/productOptionRules";
import { Check } from "lucide-react";

const SECTION_POST_FIELD_KEYS = new Set([
  "mounting_method",
  "mounting_type",
  "post_system",
  "post_size",
  "louvre_treatment",
]);

const CORE_SLAT_FIELD_KEYS = new Set([
  "finish_family",
  "colour_code",
  "post_colour_code",
  "slat_size_mm",
  "slat_gap_mode",
  "slat_gap_mm",
]);

const CORE_POST_FIELD_KEYS = new Set([
  "mounting_method",
  "mounting_type",
  "post_system",
  "post_size",
  "louvre_treatment",
]);

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

function fieldValueLabel(field: SchemaField, variables: Record<string, string | number | boolean>) {
  const raw = variables[field.field_key] ?? field.default_value_json;
  if (field.field_key === "colour_code" || field.field_key === "post_colour_code") {
    return colourName(raw);
  }
  if (raw === true) return "Yes";
  if (raw === false) return "No";
  return valueLabel(field, raw);
}

export function FenceSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const run = state.payload?.runs.find((r) => r.runId === runId);
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? "QSHS";
  const segProductCode = String(seg.variables?.product_code ?? runProductCode);

  const v = seg.variables ?? {};
  const runVariables = useMemo<Record<string, string | number | boolean>>(
    () => ({ ...(state.payload?.variables ?? {}), ...(run?.variables ?? {}) }),
    [state.payload?.variables, run],
  );
  const displayVariables: Record<string, string | number | boolean> = {
    ...runVariables,
    ...v,
  };
  // Run + segment-resolved configs. The segment config is keyed on the
  // segment's own product (when product_code is overridden) + merged variables,
  // so option lists / height ladder re-resolve for whatever system this
  // segment uses. runConfig supplies the run's panelRules / display name.
  const runConfig = useCalculatorConfig(runProductCode, runVariables);
  const config = useCalculatorConfig(segProductCode, displayVariables);
  const fenceProductsQuery = useFenceProducts();
  const fenceProducts = fenceProductsQuery.data ?? localFenceProducts;
  const [postColourOpen, setPostColourOpen] = useState(() => {
    const colour = String(displayVariables.colour_code ?? "B");
    return Boolean(v.post_colour_code && String(v.post_colour_code) !== colour);
  });

  function upsertSegment(s: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: s });
  }

  function setScalar(key: string, value: string | number | boolean | null) {
    upsertSegment(patchSegmentVariables(seg, { [key]: value }));
  }

  function onJobOverrideChange(key: string, value: string | number | boolean) {
    const base = runVariables[key];
    const nextPatch: Record<string, string | number | boolean | null> = {
      [key]: value === base ? null : value,
    };
    if (key === "colour_code") {
      const runColour = String(runVariables.colour_code ?? "");
      const runPostColour = String(runVariables.post_colour_code ?? runColour);
      const currentColour = String(displayVariables.colour_code ?? "");
      const currentPostColour = String(displayVariables.post_colour_code ?? currentColour);
      const explicitPostColour = v.post_colour_code;
      const postColourFollowsColour =
        explicitPostColour === undefined ||
        explicitPostColour === null ||
        explicitPostColour === ""
          ? runPostColour === runColour
          : currentPostColour === currentColour;
      if (postColourFollowsColour) {
        nextPatch.post_colour_code = value === runVariables.colour_code ? null : value;
      }
    }
    upsertSegment(patchSegmentVariables(seg, nextPatch));
  }

  function onJobOverridePatch(patch: Record<string, string | number | boolean | null | undefined>) {
    const nextPatch: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) continue;
      nextPatch[key] = value === runVariables[key] ? null : value;
    }
    upsertSegment(patchSegmentVariables(seg, nextPatch));
  }

  // Switch this segment's fence system. Stores product_code as a structural
  // override (null = inherit run product) and seeds panel_quantity for
  // panel-strategy products so the segment isn't left invalid. Full cascade
  // normalisation is backend-driven on the next resolve; this only bridges the
  // one structural + quantity gap the run-scoped reconciliation won't touch.
  function onSystemTypeChange(nextProductCode: string) {
    const productOverride = nextProductCode === runProductCode ? null : nextProductCode;
    const panelQuantityPatch = isPanelStrategyCode(nextProductCode)
      ? { panel_quantity: seg.variables?.panel_quantity ?? 1 }
      : {};
    upsertSegment(
      patchSegmentVariables(seg, {
        product_code: productOverride,
        ...panelQuantityPatch,
      }),
    );
  }

  const jobMax = clampPostSpacing(
    runVariables.max_panel_width_mm,
    runConfig?.panelRules.maxPanelWidthMm ?? 2600,
  );
  const effectiveMax = clampPostSpacing(v.max_panel_width_mm, jobMax);
  const [maxSpacingDraft, setMaxSpacingDraft] = useState(String(effectiveMax));
  useEffect(() => {
    setMaxSpacingDraft(String(effectiveMax));
  }, [effectiveMax]);

  const jobFields = config?.formFields.job ?? [];
  const runFields = config?.formFields.run ?? [];
  const slatOptionFields = jobFields.filter(
    (field) =>
      !field.field_key.endsWith("_stock_length_mm") &&
      field.field_key !== "max_panel_width_mm" &&
      field.field_key !== "target_height_mm" &&
      field.field_key !== "post_colour_code" &&
      field.field_key !== "louvre_treatment",
  );
  const postFields = runFields
    .map(shapePostField)
    .filter((field): field is SchemaField => Boolean(field));
  const slatFieldMap = useMemo(
    () => new Map(slatOptionFields.map((field) => [field.field_key, field])),
    [slatOptionFields],
  );
  const postFieldMap = useMemo(
    () => new Map(postFields.map((field) => [field.field_key, field])),
    [postFields],
  );

  function updateMaxPanelWidth(value: number | null) {
    const nextValue = value === null ? null : clampPostSpacing(value, jobMax);
    upsertSegment(patchSegmentVariables(seg, { max_panel_width_mm: nextValue }));
  }

  function commitMaxPanelWidth(value = maxSpacingDraft) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      setMaxSpacingDraft(String(effectiveMax));
      return;
    }
    const clamped = clampPostSpacing(nextValue, jobMax);
    setMaxSpacingDraft(String(clamped));
    updateMaxPanelWidth(clamped);
  }

  if (!config || !runConfig) return null;
  const resolvedConfig = config;
  const productCode = segProductCode;

  const isPanelStrategy = resolvedConfig.strategy.fence === "panel";
  const postSystemField = resolvedConfig.formFields.run.find((field) => field.field_key === "post_system");
  const postSystem = String(
    displayVariables.post_system ?? postSystemField?.default_value_json ?? "standard_50",
  );
  const postSize = String((displayVariables[SEGMENT_OPTION_KEYS.postSize] as string | number) ?? "");
  const isCustomPost = postSize === "custom";

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...displayVariables,
  };
  function shapePostField(field: SchemaField): SchemaField | null {
    if (!SECTION_POST_FIELD_KEYS.has(field.field_key)) return null;
    return field;
  }

  const slatFieldMapReady = slatFieldMap;
  const postFieldMapReady = postFieldMap;
  const gapMode = normaliseGapModeConfig(resolvedConfig, mergedJobDisplay.slat_gap_mode);
  const gapMm = Number(mergedJobDisplay.slat_gap_mm ?? 9);
  const postColourField = slatFieldMapReady.get("post_colour_code");
  const remainingOptionFields = slatOptionFields.filter(
    (field) => !CORE_SLAT_FIELD_KEYS.has(field.field_key),
  );
  const mountingField = postFieldMapReady.get("mounting_method") ?? postFieldMapReady.get("mounting_type");
  const remainingPostFields = postFields.filter(
    (field) =>
      !CORE_POST_FIELD_KEYS.has(field.field_key) &&
      !CORE_SLAT_FIELD_KEYS.has(field.field_key),
  );
  const louvreField = jobFields.find((field) => field.field_key === "louvre_treatment");
  function renderSlatField(key: string) {
    const field = slatFieldMapReady.get(key);
    if (!field) return null;
    return (
      <SchemaDrivenForm
        fields={[field]}
        variables={mergedJobDisplay}
        onChange={handleOptionChange}
        onPatch={onJobOverridePatch}
        extra={{ productCode, postFixingMaterials: resolvedConfig.postFixingMaterials, config: resolvedConfig }}
      />
    );
  }
  function renderPostField(key: string) {
    const field = postFieldMapReady.get(key);
    if (!field) return null;
    return (
      <SchemaDrivenForm
        fields={[field]}
        variables={mergedJobDisplay}
        onChange={handleOptionChange}
        onPatch={onJobOverridePatch}
        extra={{ productCode, config: resolvedConfig }}
      />
    );
  }
  function valueFor(key: string, fallback = "Default") {
    const field = slatFieldMapReady.get(key) ?? postFieldMapReady.get(key);
    return field ? fieldValueLabel(field, mergedJobDisplay) : fallback;
  }
  function handleOptionChange(key: string, value: string | number | boolean) {
    onJobOverrideChange(key, value);
  }
  const postSummary = `${valueLabel(postFieldMapReady.get("post_system"), postSystem, "Run default")} / ${colourName(mergedJobDisplay.post_colour_code ?? mergedJobDisplay.colour_code)} / ${effectiveMax}mm`;
  const slatSummary = `${valueFor("finish_family")} / ${colourName(mergedJobDisplay.colour_code)} / ${valueFor("slat_size_mm")} / ${combinedGapLabel(gapMode, gapMm)}`;

  return (
    <div className="space-y-4">
      <SettingsDisclosureRow
        id={`${seg.segmentId}-section-system-type`}
        label="System type"
        value={config.display.shortName}
      >
        <div className="flex flex-wrap gap-2 border-t border-brand-border/50 p-3">
          {fenceProducts.map((product) => (
            <button
              key={product.system_type}
              type="button"
              onClick={() => onSystemTypeChange(product.system_type)}
              aria-pressed={product.system_type === segProductCode}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${product.system_type === segProductCode
                ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
                }`}
            >
              {product.system_type === segProductCode && <Check size={16} aria-hidden />}
              {product.system_type}
            </button>
          ))}
        </div>
      </SettingsDisclosureRow>
      {slatOptionFields.length > 0 || postColourField ? (
        <SettingsDisclosureRow id={`${seg.segmentId}-section-style`} label="Slats, colors, and spacings" value={slatSummary || "Run defaults"}>
          <div className="space-y-4">
            {renderSlatField("finish_family")}
            {renderSlatField("colour_code")}
            {postColourField && !isPanelStrategy && (
              <>
                <button
                  type="button"
                  onClick={() => setPostColourOpen((value) => !value)}
                  className="rounded-lg border border-brand-border px-3 py-2 text-sm font-extrabold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
                >
                  {postColourOpen ? "Hide alternate post colour" : "Alternate post colour"}
                </button>
                {postColourOpen && renderSlatField("post_colour_code")}
              </>
            )}
            {renderSlatField("slat_size_mm")}
            {remainingOptionFields.length > 0 && (
              <SchemaDrivenForm
                fields={remainingOptionFields}
                variables={mergedJobDisplay}
                onChange={handleOptionChange}
              />
            )}
            {renderSlatField("slat_gap_mm")}
            {louvreField && renderSlatField("louvre_treatment")}
          </div>
        </SettingsDisclosureRow>
      ) : null}

      {!isPanelStrategy && (
        <SettingsDisclosureRow id={`${seg.segmentId}-section-posts`} label="Post size, mounting and spacing" value={postSummary}>
          <div className="space-y-4">
            {renderPostField("post_system")}
            {renderPostField("post_size")}
            {mountingField && (
              <SchemaDrivenForm
                fields={[mountingField]}
                variables={mergedJobDisplay}
                onChange={handleOptionChange}
                onPatch={onJobOverridePatch}
                extra={{ productCode, config }}
              />
            )}
            {remainingPostFields.length > 0 && (
              <SchemaDrivenForm
                fields={remainingPostFields}
                variables={mergedJobDisplay}
                onChange={handleOptionChange}
                onPatch={onJobOverridePatch}
                extra={{ productCode, config }}
              />
            )}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-brand-muted">Max Post Spacing (mm)</span>
              <input
                type="number"
                value={maxSpacingDraft}
                onChange={(event) => setMaxSpacingDraft(event.target.value)}
                onBlur={() => commitMaxPanelWidth()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                min={MIN_POST_SPACING_MM}
                max={MAX_POST_SPACING_MM}
                step={50}
                className="w-28 rounded-lg border border-brand-border bg-brand-card px-2 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
            </label>
          </div>
        </SettingsDisclosureRow>
      )}

      {!isPanelStrategy && isCustomPost && (
        <SettingsDisclosureRow
          id={`${seg.segmentId}-section-custom-post`}
          label="Custom post width"
          value={`${v[SEGMENT_OPTION_KEYS.postWidthMm] ?? "Not set"}mm`}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-brand-muted">Post width (mm)</span>
            <NumberInput
              value={(v[SEGMENT_OPTION_KEYS.postWidthMm] as number | null) ?? null}
              onChange={(val) =>
                setScalar(SEGMENT_OPTION_KEYS.postWidthMm, val)
              }
              min={1}
            />
          </label>
        </SettingsDisclosureRow>
      )}

    </div>
  );
}
