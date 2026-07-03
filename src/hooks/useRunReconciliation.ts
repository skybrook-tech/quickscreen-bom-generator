import { useEffect, useMemo, useRef } from "react";
import { useCalculator } from "../context/CalculatorContext";
import { useCalculatorConfigQuery } from "./useCalculatorConfig";
import type { CanonicalRun } from "../types/canonical.types";
import type { CanonicalVariables } from "../types/calculatorConfig.types";

/**
 * Cascade keys the backend normaliser may correct. The reconciliation effect
 * only dispatches corrections for these — never for unrelated keys the user
 * set independently — so a correction never clobbers intentional overrides.
 */
const RECONCILE_KEYS = [
  "finish_family",
  "slat_size_mm",
  "colour_code",
  "post_colour_code",
  "slat_gap_mode",
  "slat_gap_mm",
  "post_system",
  "post_size",
  "mounting_type",
  "mounting_method",
  "max_panel_width_mm",
  "target_height_mm",
  "slat_count",
] as const;

function reconcileDiff(
  current: CanonicalVariables,
  normalised: CanonicalVariables,
): CanonicalVariables {
  const diff: CanonicalVariables = {};
  for (const key of RECONCILE_KEYS) {
    const cur = current[key];
    const norm = normalised[key];
    if (norm === undefined) continue;
    if (String(cur ?? "") !== String(norm)) {
      diff[key] = norm as string | number | boolean;
    }
  }
  return diff;
}

function mergeRunVariables(run: CanonicalRun): CanonicalVariables {
  return { ...(run.variables ?? {}) };
}

/**
 * Run-scoped reconciliation: diffs the resolved config's `normalisedVariables`
 * against the run's current variables and dispatches cascade corrections
 * (e.g. economy finish snapping slat 90→65 + colour to the economy set) so the
 * client no longer needs product-specific normalisation logic. Only ever
 * dispatches `UPSERT_RUN` against `run.variables` — segment-level overrides
 * (including per-segment `product_code`) are never touched.
 *
 * Call once per run (in `RunCardInner`). Side-effect only; returns nothing.
 */
export function useRunReconciliation(run: CanonicalRun) {
  const { dispatch } = useCalculator();

  const runVariables = useMemo(() => mergeRunVariables(run), [run]);

  const configQuery = useCalculatorConfigQuery(run.productCode, runVariables);
  const config = configQuery.data;
  const lastDispatchedSig = useRef<string>("");

  // Reconcile cascade corrections only when the config is fresh for the
  // current variables key (not while keepPreviousData is showing stale data
  // during a refetch). The signature guard prevents re-dispatching the same
  // correction every render.
  useEffect(() => {
    if (!config || configQuery.isFetching) return;
    const diff = reconcileDiff(runVariables, config.normalisedVariables);
    if (Object.keys(diff).length === 0) {
      lastDispatchedSig.current = "";
      return;
    }
    const sig = JSON.stringify(diff);
    if (sig === lastDispatchedSig.current) return;
    lastDispatchedSig.current = sig;
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: { ...(run.variables ?? {}), ...diff },
      },
    });
  }, [config, configQuery.isFetching, runVariables, run, dispatch]);
}
