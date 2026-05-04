import { useEffect, useMemo } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { getMasterFenceSegment } from "../../../lib/masterFenceSegment";
import type { CanonicalRun } from "../../../types/canonical.types";

/**
 * Seeds missing job+run-scoped product_variables defaults onto the master fence
 * segment (replaces former RunConfigPanel seeding into run.variables).
 */
export function MasterFenceVariableSeeds({ run }: { run: CanonicalRun }) {
  const { state, dispatch } = useCalculatorV4();
  const productCode = run.productCode ?? state.payload?.productCode ?? null;

  const { data: jobFields = [] } = useProductVariables(productCode, "job");
  const { data: runFields = [] } = useProductVariables(productCode, "run");

  const allFields = useMemo(
    () =>
      [...jobFields, ...runFields].sort((a, b) => a.sort_order - b.sort_order),
    [jobFields, runFields],
  );

  const master = useMemo(() => getMasterFenceSegment(run), [run]);

  useEffect(() => {
    if (!master || !state.payload || allFields.length === 0) return;

    const effectiveVars = {
      ...(state.payload.variables ?? {}),
      ...(run.variables ?? {}),
      ...(master.variables ?? {}),
    };

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
      type: "UPSERT_SEGMENT",
      runId: run.runId,
      segment: {
        ...master,
        variables: { ...(master.variables ?? {}), ...missing },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFields.length, productCode, run.runId, master?.segmentId, run]);

  return null;
}
