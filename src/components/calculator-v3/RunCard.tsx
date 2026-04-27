import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import type { CanonicalRun, CanonicalSegment } from "../../types/canonical.types";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import { calcRunStats } from "../../lib/runStats";
import { localFenceProducts } from "../../lib/localSeedData";
import {
  applyProductOptionRules,
  initialVariablesForSystem,
  maxPanelWidthForSystem,
  normaliseVariablesForSystem,
} from "../../lib/productOptionRules";
import { Button } from "../shared/Button";
import NumberInput from "../shared/NumberInput";
import { SegmentRow } from "./SegmentRow";
import { SchemaDrivenForm } from "./SchemaDrivenForm";

const GATE_PRODUCT_CODE = "QS_GATE";

interface Props {
  run: CanonicalRun;
  runIdx: number;
}

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => acc + (seg.segmentWidthMm ?? 0), 0);

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
  const optionFields = useMemo(
    () =>
      applyProductOptionRules(
        run.productCode,
        jobFields.filter((field) => !field.field_key.endsWith("_stock_length_mm")),
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
  const visibleRunFields = runFields.filter(
    (field) =>
      !["left_boundary_type", "right_boundary_type"].includes(field.field_key),
  );

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
    if (
      key === "colour_code" &&
      (!run.variables?.post_colour_code || previousPostColour === previousColour)
    ) {
      nextVariables.post_colour_code = value;
    }
    dispatch({
      type: "UPSERT_RUN",
      run: {
        ...run,
        variables: normaliseVariablesForSystem(run.productCode, nextVariables),
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
          ...(run.variables ?? {}),
        }),
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
    upsertSegment({
      segmentId: crypto.randomUUID(),
      sortOrder: run.segments.length + 1,
      segmentKind: "gate_opening",
      segmentWidthMm: 1000,
      targetHeightMm: 1800,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: {
        [GATE_SEGMENT_STUB_KEYS.hingeType]: "dd-kwik-fit-fixed",
        [GATE_SEGMENT_STUB_KEYS.latchType]: "dd-magna-latch-top-pull",
      },
    });
  }

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-brand-text">
          Run {runIdx + 1} - {run.productCode}
        </h3>
        <Button
          onClick={() => setEditingRun((value) => !value)}
          icon={Pencil}
          variant="ghost"
          size="small"
        >
          {editingRun ? "Done" : "Edit run"}
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-brand-muted">
        <span>Fence colour: {runVariables.colour_code ?? "B"}</span>
        <span>
          Post colour: {runVariables.post_colour_code ?? runVariables.colour_code ?? "B"}
        </span>
        <span>Run left: {run.leftBoundary.type.replace(/_/g, " ")}</span>
        <span>Run right: {run.rightBoundary.type.replace(/_/g, " ")}</span>
        <span>Corners: {run.corners.length}</span>
        <span>Segments: {run.segments.length}</span>
        <span>Total length: {(calcTotalLength(run) / 1000).toFixed(2)}m</span>
        {stats.panels > 0 && <span>Panels: {stats.panels}</span>}
        {stats.posts > 0 && <span>Posts: {stats.posts}</span>}
      </div>

      {editingRun && (
        <div className="mb-3 space-y-4 rounded-md border border-brand-border/60 bg-brand-bg/60 p-3">
          <div>
            <p className="mb-2 text-xs font-medium text-brand-muted">
              System type
            </p>
            <div className="flex flex-wrap gap-2">
              {localFenceProducts.map((product) => (
                <button
                  key={product.system_type}
                  type="button"
                  onClick={() => changeRunProduct(product.system_type)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    product.system_type === run.productCode
                      ? "border-blue-800 bg-blue-800 text-white shadow-sm"
                      : "border-brand-border bg-white text-brand-text hover:border-blue-800 hover:text-blue-800"
                  }`}
                >
                  {product.system_type}
                </button>
              ))}
            </div>
          </div>

          {optionFields.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-brand-muted">
                Run options
              </p>
              <SchemaDrivenForm
                fields={optionFields}
                variables={runVariables}
                onChange={handleRunFieldChange}
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-brand-muted">
              Post colour
            </p>
            {!editingPostColour ? (
              <button
                type="button"
                onClick={() => setEditingPostColour(true)}
                className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-text transition-colors hover:border-blue-800 hover:text-blue-800"
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

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-brand-muted">
              Max panel width
            </span>
            <div className="flex items-center gap-2">
              <NumberInput
                min={300}
                max={maxPanelWidthForSystem(run.productCode)}
                step={50}
                value={jobMax}
                onChange={(v) => handleRunFieldChange("max_panel_width_mm", v)}
                className="w-28 rounded border border-brand-border bg-white px-3 py-2 text-sm text-brand-text"
              />
              <span className="text-sm text-brand-muted">mm</span>
            </div>
          </label>

          {visibleRunFields.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-brand-muted">
                Fixing and posts
              </p>
              <SchemaDrivenForm
                fields={visibleRunFields}
                variables={runVariables}
                onChange={handleRunFieldChange}
              />
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
