import { useEffect, useMemo } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { useProducts } from "../../../hooks/useProducts";
import type { CanonicalRun } from "../../../types/canonical.types";
import type { RunTab } from "./RunSubHeader";
import { SchemaDrivenFormV4 } from "./SchemaDrivenFormV4";
import type { SchemaField } from "../../calculator-v3/SchemaDrivenForm";
import { ProductSelectV4 } from "../JobShell/ProductSelectV4";

// Maps field_key → which tab it lives in.
// Unmapped fields fall through to "style".
const FIELD_TAB_MAP: Record<string, RunTab> = {
  colour_code: "style",
  slat_size_mm: "style",
  slat_gap_mm: "style",
  finish_type: "style",
  finish_family: "style",
  mounting_type: "posts",
  post_size_mm: "posts",
  max_panel_width_mm: "posts",
  target_height_mm: "defaults",
  default_left_termination: "defaults",
  default_right_termination: "defaults",
};

function tabForField(field: SchemaField): RunTab {
  return FIELD_TAB_MAP[field.field_key] ?? "style";
}

interface Props {
  run: CanonicalRun;
  activeTab: RunTab;
}

export function RunConfigPanel({ run, activeTab }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const { data: products = [] } = useProducts();

  // Use run's own productCode if set, else fall back to payload default
  const runProductCode = run.productCode ?? state.payload?.productCode ?? null;

  const { data: jobFields = [] } = useProductVariables(runProductCode, "job");
  const { data: runFields = [] } = useProductVariables(runProductCode, "run");

  const allFields = useMemo(
    () =>
      [...jobFields, ...runFields].sort((a, b) => a.sort_order - b.sort_order),
    [jobFields, runFields],
  );

  const effectiveVars = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run.variables ?? {}),
    }),
    [state.payload?.variables, run.variables],
  );

  // Seed run.variables with product_variables defaults for any key not yet set.
  useEffect(() => {
    if (allFields.length === 0) return;
    const missing: Record<string, string | number | boolean> = {};
    for (const f of allFields) {
      const current = effectiveVars[f.field_key];
      if (current === undefined && f.default_value_json != null) {
        missing[f.field_key] = f.default_value_json as
          | string
          | number
          | boolean;
      }
      const opts = Array.isArray(f.options_json)
        ? f.options_json.map(String)
        : [];
      const allowCustomNumericGap =
        f.field_key === "slat_gap_mm" &&
        current != null &&
        Number.isFinite(Number(current));
      if (
        opts.length > 0 &&
        current != null &&
        !opts.includes(String(current)) &&
        f.default_value_json != null &&
        !allowCustomNumericGap
      ) {
        missing[f.field_key] = f.default_value_json as
          | string
          | number
          | boolean;
      }
    }
    if (Object.keys(missing).length === 0) return;
    dispatch({
      type: "UPSERT_RUN_VARIABLES",
      runId: run.runId,
      variables: missing,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFields.length, runProductCode, run.runId]);

  function handleChange(key: string, value: string | number | boolean) {
    dispatch({
      type: "UPSERT_RUN_VARIABLES",
      runId: run.runId,
      variables: { [key]: value },
    });
  }

  function handleProductChange(code: string) {
    dispatch({ type: "SET_RUN_PRODUCT", runId: run.runId, productCode: code });
  }

  // Filter to active fence products, max 5 for segmented control
  const fenceProducts = products.filter(
    (p) => p.active && p.system_type && p.system_type !== "QS_GATE",
  );

  const tabFields = allFields.filter((f) => tabForField(f) === activeTab);

  return (
    <div className="p-4 space-y-5">
      {/* Per-run product selector — only shown in Style tab */}
      {activeTab === "style" && fenceProducts.length > 1 && (
        <div className="space-y-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Fence System
          </label>
          <ProductSelectV4
            value={runProductCode ?? ""}
            onChange={handleProductChange}
          />
        </div>
      )}

      <SchemaDrivenFormV4
        fields={tabFields}
        variables={effectiveVars}
        onChange={handleChange}
      />
    </div>
  );
}
