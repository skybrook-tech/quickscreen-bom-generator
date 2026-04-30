import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { defaultGateVariables } from "../../lib/gateOptionRules";
import { calcRunStats } from "../../lib/runStats";
import { localFenceProducts } from "../../lib/localSeedData";
import {
  applyProductOptionRules,
  initialVariablesForSystem,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import { Button } from "../shared/Button";
import { SegmentRow } from "./SegmentRow";
import { SchemaDrivenForm } from "./SchemaDrivenForm";

const GATE_PRODUCT_CODE = "QS_GATE";

interface Props {
  run: CanonicalRun;
  runIdx: number;
}

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => acc + (seg.segmentWidthMm ?? 0), 0);

const MOUNTING_LABELS: Record<string, string> = {
  in_ground: "Concreted in ground",
  base_plate: "Base-plated to slab",
  core_drill: "Core-drilled into concrete",
};

const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
};

const POST_SYSTEM_LABELS: Record<string, string> = {
  xpl: "XPress Plus post",
  standard_50: "Standard Post 50mm",
  standard_65: "Standard Post 65mm HD",
};

function postSummaryLabel(productCode: string, variables: Record<string, unknown>) {
  const postSystem = String(
    variables.post_system ?? (productCode === "XPL" ? "xpl" : "standard_50"),
  );
  if (productCode === "XPL") {
    return POST_SYSTEM_LABELS[postSystem] ?? "XPress Plus post";
  }
  const postSize = String(variables.post_size ?? "50");
  return postSize === "65" ? "Standard Post 65mm HD" : "Standard Post 50mm";
}

function colourLabel(code: unknown) {
  const colourCode = String(code ?? "B");
  return COLOUR_NAMES[colourCode] ? `${COLOUR_NAMES[colourCode]} (${colourCode})` : colourCode;
}

function actualFenceHeightMm(productCode: string, variables: Record<string, unknown>) {
  const targetHeight = Number(variables.target_height_mm ?? 1800);
  if (productCode === "VS") return targetHeight;
  const slatSize = Number(variables.slat_size_mm ?? 65);
  const slatGap = Number(variables.slat_gap_mm ?? 5);
  const slatDesignWidth = slatSize === 90 ? 90.3 : 65.3;
  const numSlats = Math.max(
    1,
    Math.floor((targetHeight + slatGap - 3) / (slatDesignWidth + slatGap)),
  );
  return Math.round(numSlats * (slatDesignWidth + slatGap) - slatGap + 3);
}

function panelLengthSummary(run: CanonicalRun, jobMaxPanelWidth: number) {
  const lengths = run.segments
    .filter((segment) => segment.segmentKind !== "gate_opening" && Number(segment.segmentWidthMm ?? 0) > 0)
    .flatMap((segment) => {
      const maxPanelWidth = Math.max(
        300,
        Number(segment.variables?.max_panel_width_mm ?? jobMaxPanelWidth),
      );
      const panels = Math.max(1, Math.ceil(Number(segment.segmentWidthMm ?? 0) / maxPanelWidth));
      const panelWidth = Number(segment.segmentWidthMm ?? 0) / panels;
      return Array.from({ length: panels }, () => Math.round(panelWidth));
    });

  const counts = new Map<number, number>();
  for (const length of lengths) counts.set(length, (counts.get(length) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([length, count]) => `${count} x ${(length / 1000).toFixed(2)}m`)
    .join(", ");
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-full bg-brand-bg/80 px-2.5 py-1 text-brand-muted">
      <strong className="font-bold text-brand-text">{label}:</strong> {value}
    </span>
  );
}

export function RunCard({ run, runIdx }: Props) {
  const { state, dispatch } = useCalculator();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRun, setEditingRun] = useState(runIdx === 0);
  const [editingPostColour, setEditingPostColour] = useState(false);
  const { data: jobFields = [] } = useProductVariables(run.productCode, "job");
  const { data: runFields = [] } = useProductVariables(run.productCode, "run");

  const runVariables = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(run.variables ?? {}),
    }),
    [run.variables, state.payload?.variables],
  );
  const jobMax = Number(
    runVariables.max_panel_width_mm ?? maxPanelWidthForSystem(run.productCode),
  );
  const stats = calcRunStats(run, jobMax);
  const panelLengths = panelLengthSummary(run, jobMax);
  const actualHeight = actualFenceHeightMm(run.productCode, runVariables);
  const matchesRunOne = run.variables?.settings_mode === "match_run_1";
  const optionFields = useMemo(
    () =>
      applyProductOptionRules(
        run.productCode,
        jobFields.filter(
          (field) =>
            !field.field_key.endsWith("_stock_length_mm") &&
            field.field_key !== "max_panel_width_mm",
        ),
        runVariables,
      ).filter((field) => field.field_key !== "post_colour_code"),
    [jobFields, run.productCode, runVariables],
  );
  const postColourField = useMemo(
    () =>
      applyProductOptionRules(run.productCode, [], runVariables).find(
        (field) => field.field_key === "post_colour_code",
      ),
    [run.productCode, runVariables],
  );
  const visibleRunFields = runFields
    .filter((field) => {
      if (["left_boundary_type", "right_boundary_type"].includes(field.field_key)) {
        return false;
      }
      if (run.productCode === "XPL" && field.field_key === "mounting_type") {
        return false;
      }
      if (run.productCode !== "XPL" && field.field_key === "mounting_method") {
        return false;
      }
      return true;
    })
    .map((field) => {
      if (field.field_key === "mounting_type" || field.field_key === "mounting_method") {
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
          label: "Post type",
          default_value_json: run.productCode === "XPL" ? "xpl" : "standard_50",
        };
      }
      if (field.field_key === "post_size") {
        return {
          ...field,
          label: "Standard post size",
          default_value_json: "50",
        };
      }
      return field;
    });

  function handleRunFieldChange(
    key: string,
    value: string | number | boolean,
  ) {
    const previousColour = String(runVariables.colour_code ?? "");
    const previousPostColour = String(
      runVariables.post_colour_code ?? previousColour,
    );
    const nextVariables = {
      ...(run.variables ?? {}),
      [key]: value,
    };
    if (key === "mounting_type" || key === "mounting_method") {
      nextVariables.mounting_type = value;
      nextVariables.mounting_method = value;
    }
    if (key === "post_system") {
      nextVariables.post_size = value === "standard_65" ? 65 : 50;
    }
    if (
      key === "colour_code" &&
      (!run.variables?.post_colour_code || previousPostColour === previousColour)
    ) {
      nextVariables.post_colour_code = value;
    }
    const normalisedVariables = normaliseVariablesForSystem(
      run.productCode,
      nextVariables,
    );
    const shouldSyncSegmentHeights = [
      "target_height_mm",
      "slat_size_mm",
      "slat_gap_mm",
      "slat_gap_mode",
    ].includes(key);
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: normalisedVariables,
        segments: shouldSyncSegmentHeights
          ? run.segments.map((segment) => ({
              ...segment,
              targetHeightMm: Number(normalisedVariables.target_height_mm ?? 1800),
            }))
          : run.segments,
      },
    });
  }

  function changeRunProduct(productCode: string) {
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        productCode,
        variables: normaliseVariablesForSystem(productCode, {
          ...initialVariablesForSystem(productCode),
          settings_mode: "default",
          colour_code: run.variables?.colour_code ?? "B",
          post_colour_code:
            run.variables?.post_colour_code ?? run.variables?.colour_code ?? "B",
          max_panel_width_mm:
            run.variables?.max_panel_width_mm ?? maxPanelWidthForSystem(productCode),
        }),
      },
    });
  }

  function toggleRunOneSettings() {
    const runOne = state.payload?.runs[0];
    if (!runOne || runOne.runId === run.runId) return;
    if (matchesRunOne) {
      dispatch({
        type: "UPSERT_RUN",
        run: {
          ...run,
          variables: normaliseVariablesForSystem(run.productCode, {
            ...initialVariablesForSystem(run.productCode),
            settings_mode: "default",
          }),
        },
      });
      return;
    }
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        productCode: runOne.productCode,
        variables: normaliseVariablesForSystem(runOne.productCode, {
          ...(runOne.variables ?? {}),
          settings_mode: "match_run_1",
        }),
        leftBoundary: runOne.leftBoundary,
        rightBoundary: runOne.rightBoundary,
      },
    });
  }

  function upsertSegment(segment: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId: run.runId, segment });
  }

  function addFenceSegment() {
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      segmentKind: "panel",
      segmentWidthMm: jobMax,
      targetHeightMm: Number(runVariables.target_height_mm ?? 1800),
    });
  }

  function addGateSegment() {
    const targetHeight = Number(runVariables.target_height_mm ?? 1800);
    const segmentId = crypto.randomUUID();
    upsertSegment({
      segmentId,
      sortOrder: run.segments.length + 1,
      segmentKind: "gate_opening",
      segmentWidthMm: 900,
      targetHeightMm: targetHeight,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: defaultGateVariables(runVariables, targetHeight),
    });
    setExpandedId(segmentId);
  }

  return (
    <div className="rounded-2xl border border-brand-border/70 bg-brand-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-brand-text">
          <span>Run {runIdx + 1} - {run.productCode}</span>
          <span>Total run length {(calcTotalLength(run) / 1000).toFixed(2)}m</span>
          <span>Height {actualHeight}mm</span>
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {runIdx > 0 && (
            <Button
              onClick={toggleRunOneSettings}
              icon={Copy}
              variant={matchesRunOne ? "primary" : "ghost"}
              size="small"
            >
              {matchesRunOne ? "Default settings" : "Match run 1"}
            </Button>
          )}
          <Button
            onClick={() => setEditingRun((value) => !value)}
            icon={Pencil}
            variant="ghost"
            size="small"
          >
            {editingRun ? "Done" : "Edit run"}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-sm font-semibold">
        <SummaryItem label="Fence colour" value={colourLabel(runVariables.colour_code)} />
        <SummaryItem label="Post colour" value={colourLabel(runVariables.post_colour_code ?? runVariables.colour_code)} />
        <SummaryItem label="Slat" value={`${runVariables.slat_size_mm ?? 65}mm`} />
        <SummaryItem label="Gap" value={`${runVariables.slat_gap_mm ?? 5}mm`} />
        <SummaryItem label="Post" value={postSummaryLabel(run.productCode, runVariables)} />
        <SummaryItem
          label="Mounting"
          value={
            MOUNTING_LABELS[
              String(runVariables.mounting_method ?? runVariables.mounting_type ?? "in_ground")
            ] ?? "Concreted in ground"
          }
        />
        <SummaryItem label="Corners" value={run.corners.length} />
        <SummaryItem label="Segments" value={run.segments.length} />
        {stats.panels > 0 && <SummaryItem label="Panels" value={stats.panels} />}
        {panelLengths && <SummaryItem label="Panel lengths" value={panelLengths} />}
        {stats.posts > 0 && <SummaryItem label="Posts" value={stats.posts} />}
      </div>

      {editingRun && (
        <div className="mb-3 space-y-4 rounded-2xl border border-brand-border/60 bg-brand-bg/70 p-3">
          <div>
            <p className="mb-2 text-sm font-bold text-brand-muted">
              System type
            </p>
            <div className="flex flex-wrap gap-2">
              {localFenceProducts.map((product) => (
                <button
                  key={product.system_type}
                  type="button"
                  onClick={() => changeRunProduct(product.system_type)}
                  className={`rounded-full border px-3 py-2 text-sm font-bold shadow-sm transition-colors ${
                    product.system_type === run.productCode
                      ? "border-blue-800 bg-blue-800 text-white shadow-sm"
                      : "border-brand-border bg-brand-card text-brand-text hover:border-blue-800 hover:text-blue-800"
                  }`}
                >
                  {product.system_type}
                </button>
              ))}
            </div>
          </div>

          {optionFields.length > 0 && (
            <div>
              <SchemaDrivenForm
                fields={optionFields}
                variables={runVariables}
                onChange={handleRunFieldChange}
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-bold text-brand-muted">
              Post colour
            </p>
            {!editingPostColour ? (
              <button
                type="button"
                onClick={() => setEditingPostColour(true)}
                className="rounded-full border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-text shadow-sm transition-colors hover:border-blue-800 hover:text-blue-800"
              >
                Same as fence ({runVariables.colour_code ?? "B"})
              </button>
            ) : postColourField ? (
              <SchemaDrivenForm
                fields={[postColourField]}
                variables={runVariables}
                onChange={handleRunFieldChange}
              />
            ) : null}
          </div>

          {visibleRunFields.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold text-brand-muted">
                Posts and fixing
              </p>
              <SchemaDrivenForm
                fields={visibleRunFields}
                variables={runVariables}
                onChange={handleRunFieldChange}
              />
              {run.productCode === "XPL" &&
                String(runVariables.post_system ?? "xpl") !== "xpl" && (
                  <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold leading-relaxed text-amber-700">
                    Standard posts on XPress Plus need the XPress Plus side
                    frame and the insert that matches the selected gap.
                  </p>
                )}
            </div>
          )}
        </div>
      )}

      {run.segments.length === 0 && (
        <p className="mb-3 text-xs italic text-brand-muted">
          No segments yet. Draw on canvas or add manually.
        </p>
      )}

      <div className="space-y-2">
        {run.segments.map((seg, segIdx) => (
          <SegmentRow
            key={seg.segmentId}
            runId={run.runId}
            seg={seg}
            segIdx={segIdx}
            runIdx={runIdx}
            open={expandedId === seg.segmentId}
            onToggle={() =>
              setExpandedId((id) => (id === seg.segmentId ? null : seg.segmentId))
            }
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button onClick={addFenceSegment} icon={Plus} variant="ghost" size="small">
          Add segment
        </Button>
        <Button onClick={addGateSegment} icon={Plus} variant="ghost" size="small">
          Add gate
        </Button>
        <Button
          onClick={() => dispatch({ type: "REMOVE_RUN", runId: run.runId })}
          icon={Trash2}
          variant="ghost-danger"
          size="small"
        >
          Remove run
        </Button>
      </div>
    </div>
  );
}
