import { useEffect, useMemo, useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalSegment } from "../../types/canonical.types";
import {
  applyProductOptionRules,
  clampPostSpacing,
  initialVariablesForSystem,
  MAX_POST_SPACING_MM,
  maxPanelWidthForSystem,
  MIN_POST_SPACING_MM,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import { localFenceProducts } from "../../lib/localSeedData";
import {
  SEGMENT_OPTION_KEYS,
  patchSegmentVariables,
} from "../../lib/segmentTermination";
import { SchemaDrivenForm, type SchemaField } from "./SchemaDrivenForm";
import NumberInput from "../shared/NumberInput";
import { SettingsDisclosureRow } from "./SettingsDisclosureRow";
import { ColourPalette } from "./ColourPalette";

const POST_SIZE_LABELS: Record<string, string> = {
  "50": "50mm Post Standard",
  "65": "65mm Post Standard HD",
  standard_50: "50mm Post Standard",
  standard_65: "65mm Post Standard HD",
  xpl: "XPress Plus post",
};

const SECTION_POST_FIELD_KEYS = new Set([
  "mounting_method",
  "mounting_type",
  "post_system",
  "post_size",
]);

interface Props {
  runId: string;
  seg: CanonicalSegment;
}

export function FenceSegmentDetails({ runId, seg }: Props) {
  const { state, dispatch } = useCalculator();
  const run = state.payload?.runs.find((item) => item.runId === runId);
  const runProductCode = run?.productCode ?? state.payload?.productCode ?? "QSHS";
  const productCode = String(seg.variables?.product_code ?? runProductCode);
  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  const v = seg.variables ?? {};
  const runVariables = {
    ...initialVariablesForSystem(productCode),
    ...(state.payload?.variables ?? {}),
    ...(run?.variables ?? {}),
  };
  const displayVariables = normaliseVariablesForSystem(productCode, {
    ...runVariables,
    ...v,
    product_code: productCode,
  });
  const postSystem = String(displayVariables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"));
  const postSize = String((displayVariables[SEGMENT_OPTION_KEYS.postSize] as string | number) ?? "");
  const isCustomPost = postSize === "custom";
  const isBayg = productCode === "BAYG";
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
    upsertSegment(
      patchSegmentVariables(seg, { [key]: value === base ? null : value }),
    );
  }

  function onSystemTypeChange(nextProductCode: string) {
    const normalised = normaliseVariablesForSystem(nextProductCode, {
      ...initialVariablesForSystem(nextProductCode),
      ...runVariables,
      ...v,
      product_code: nextProductCode,
    });
    upsertSegment(
      patchSegmentVariables(seg, {
        product_code: nextProductCode === runProductCode ? null : nextProductCode,
        finish_family: normalised.finish_family,
        colour_code: normalised.colour_code,
        post_colour_code: normalised.post_colour_code,
        slat_size_mm: normalised.slat_size_mm,
        slat_gap_mode: normalised.slat_gap_mode,
        slat_gap_mm: normalised.slat_gap_mm,
        post_system: normalised.post_system,
        post_size: normalised.post_size,
        mounting_type: normalised.mounting_type,
        mounting_method: normalised.mounting_method,
        max_panel_width_mm: normalised.max_panel_width_mm,
      }),
    );
  }

  const jobMax = clampPostSpacing(
    runVariables.max_panel_width_mm,
    maxPanelWidthForSystem(productCode),
  );
  const effectiveMax = clampPostSpacing(v.max_panel_width_mm, jobMax);
  const [maxSpacingDraft, setMaxSpacingDraft] = useState(String(effectiveMax));
  useEffect(() => {
    setMaxSpacingDraft(String(effectiveMax));
  }, [effectiveMax]);

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

  const mergedJobDisplay: Record<string, string | number | boolean> = {
    ...displayVariables,
  };
  function shapePostField(field: SchemaField): SchemaField | null {
    if (!SECTION_POST_FIELD_KEYS.has(field.field_key)) return null;
    if (
      field.field_key === "mounting_method" ||
      field.field_key === "mounting_type"
    ) {
      return {
        ...field,
        label: "Post mounting type",
        default_value_json: "in_ground",
        options_json: ["in_ground", "base_plate", "core_drill"],
      };
    }
    if (field.field_key === "post_system") {
      return {
        ...field,
        label: "Post size",
        default_value_json: productCode === "XPL" ? "xpl" : "standard_50",
      };
    }
    if (field.field_key === "post_size") {
      return {
        ...field,
        label: "Standard post size",
        default_value_json: 50,
      };
    }
    return null;
  }

  const optionFields = useMemo(
    () =>
      productCode
        ? applyProductOptionRules(
            productCode,
            jobFields.filter(
              (field) =>
                !field.field_key.endsWith("_stock_length_mm") &&
                field.field_key !== "max_panel_width_mm" &&
                field.field_key !== "target_height_mm" &&
                field.field_key !== "post_colour_code" &&
                field.field_key !== "louvre_treatment",
            ),
            mergedJobDisplay,
          )
        : [],
    [jobFields, mergedJobDisplay, productCode],
  );
  const postFields = useMemo(
    () =>
      productCode
        ? applyProductOptionRules(
          productCode,
          runFields
            .map(shapePostField)
            .filter((field): field is SchemaField => Boolean(field)),
          mergedJobDisplay,
        )
        : [],
    [mergedJobDisplay, productCode, runFields],
  );
  const slatOptionFields = optionFields.filter(
    (field) => field.field_key !== "finish_family",
  );
  const optionSummary = slatOptionFields
    .map((field) => {
      const raw = mergedJobDisplay[field.field_key] ?? field.default_value_json;
      if (raw === undefined || raw === null || raw === "") return null;
      const label =
        raw === true
          ? "Yes"
          : raw === false
            ? "No"
            : `${raw}${field.unit ?? ""}`;
      return `${field.label}: ${label}`;
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");
  const colourField = slatOptionFields.find((field) => field.field_key === "colour_code");
  const postColourField = applyProductOptionRules(
    productCode,
    jobFields.filter((field) => field.field_key === "post_colour_code"),
    mergedJobDisplay,
  )[0];
  const remainingOptionFields = slatOptionFields.filter(
    (field) => field.field_key !== "colour_code",
  );
  function handleOptionChange(key: string, value: string | number | boolean) {
    onJobOverrideChange(key, value);
  }
  const postSummary = `${POST_SIZE_LABELS[postSystem] ?? POST_SIZE_LABELS[postSize] ?? (postSize ? `${postSize}mm Post` : "Run default")} / ${effectiveMax}mm`;

  return (
    <div className="space-y-4">
      <SettingsDisclosureRow id={`${seg.segmentId}-section-system-type`} label="System type" value={productCode}>
        <div className="flex flex-wrap gap-2">
          {localFenceProducts.map((product) => (
            <button
              key={product.system_type}
              type="button"
              onClick={() => onSystemTypeChange(product.system_type)}
              aria-pressed={product.system_type === productCode}
              className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                product.system_type === productCode
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                  : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
              }`}
            >
              {product.system_type}
            </button>
          ))}
        </div>
      </SettingsDisclosureRow>

      {slatOptionFields.length > 0 || postColourField ? (
        <SettingsDisclosureRow id={`${seg.segmentId}-section-style`} label="Slats, colors, and spacings" value={optionSummary || "Run defaults"}>
          <div className="space-y-4">
            {colourField && (
              <SchemaDrivenForm
                fields={[colourField]}
                variables={mergedJobDisplay}
                onChange={handleOptionChange}
              />
            )}
            {postColourField && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPostColourOpen((value) => !value)}
                  className="rounded-lg border border-brand-border px-3 py-2 text-sm font-extrabold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
                >
                  {postColourOpen ? "Hide alternate post colour" : "Alternate post colour"}
                </button>
                {postColourOpen && (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-brand-muted">Post colour</p>
                    <ColourPalette
                      value={String(mergedJobDisplay.post_colour_code ?? mergedJobDisplay.colour_code ?? "B")}
                      options={(postColourField.options_json ?? colourField?.options_json ?? ["B", "MN", "G", "SM", "W", "BS", "D", "M"]).map(String)}
                      onChange={(value) => handleOptionChange("post_colour_code", value)}
                    />
                  </div>
                )}
              </div>
            )}
            {remainingOptionFields.length > 0 && (
              <SchemaDrivenForm
                fields={remainingOptionFields}
                variables={mergedJobDisplay}
                onChange={handleOptionChange}
              />
            )}
          </div>
          {productCode === "QSHS" && (
            <label className="flex items-start gap-3 rounded-xl border border-brand-border/60 bg-brand-bg/50 p-3">
              <input
                type="checkbox"
                checked={mergedJobDisplay.louvre_treatment === true || mergedJobDisplay.louvre_treatment === "true"}
                disabled={Number(mergedJobDisplay.slat_size_mm ?? 65) !== 65}
                onChange={(event) => onJobOverrideChange("louvre_treatment", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
              />
              <span>
                <span className="block text-sm font-extrabold text-brand-text">Louvre treatment</span>
                <span className="mt-1 block text-xs font-semibold text-brand-muted">
                  40 degree slat angle. Available with 65mm slats.
                </span>
              </span>
            </label>
          )}
        </SettingsDisclosureRow>
      ) : null}

      {!isBayg && (
        <SettingsDisclosureRow id={`${seg.segmentId}-section-posts`} label="Post size, mounting and spacing" value={postSummary}>
          {postFields.length > 0 && (
            <SchemaDrivenForm
              fields={postFields}
              variables={mergedJobDisplay}
              onChange={handleOptionChange}
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
              className="w-28 rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            />
          </label>
        </SettingsDisclosureRow>
      )}

      {!isBayg && isCustomPost && (
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
