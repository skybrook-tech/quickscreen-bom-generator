import { useMemo, useState } from "react";
import { useCalculator } from "../../context/CalculatorContext";
import { useProductVariables } from "../../hooks/useProductVariables";
import { SchemaDrivenForm } from "./SchemaDrivenForm";
import type {
  CanonicalRun,
  CanonicalSegment,
} from "../../types/canonical.types";
import {
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_OPTION_KEYS,
  SEGMENT_TERMINATION_KEYS,
  type NonSystemSubtypeUi,
  type TerminationKindUi,
} from "../../lib/segmentTermination";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "../shared/Button";

const GATE_PRODUCT_CODE = "QS_GATE";

const CORNER_DEGREE_OPTIONS = [90, 135] as const;

const calcTotalLength = (run: CanonicalRun) =>
  run.segments.reduce((acc, seg) => acc + (seg.panelWidthMm ?? 0), 0);

function isGateSegment(seg: CanonicalSegment): boolean {
  return seg.segmentKind === "gate_opening";
}

function patchSegmentVariables(
  seg: CanonicalSegment,
  patch: Record<string, string | number | boolean | null | undefined>,
): CanonicalSegment {
  const next: Record<string, string | number | boolean> = {
    ...(seg.variables ?? {}),
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") delete next[k];
    else next[k] = v;
  }
  return { ...seg, variables: Object.keys(next).length ? next : undefined };
}

export function RunListV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const productCode = payload?.productCode ?? null;
  const { data: jobFields = [] } = useProductVariables(productCode, "job");

  const jobFieldKeys = useMemo(
    () => new Set(jobFields.map((f) => f.field_key)),
    [jobFields],
  );

  if (!payload) return null;

  function upsertSegment(runId: string, segment: CanonicalSegment) {
    dispatch({ type: "UPSERT_SEGMENT", runId, segment });
  }

  function addFenceSegment(runId: string) {
    const run = payload!.runs.find((r) => r.runId === runId);
    const segment: CanonicalSegment = {
      segmentId: crypto.randomUUID(),
      sortOrder: (run?.segments.length ?? 0) + 1,
      segmentKind: "panel",
      panelWidthMm: 2500,
      targetHeightMm: 1800,
    };
    upsertSegment(runId, segment);
  }

  function addGateSegment(runId: string) {
    const run = payload!.runs.find((r) => r.runId === runId);
    const segment: CanonicalSegment = {
      segmentId: crypto.randomUUID(),
      sortOrder: (run?.segments.length ?? 0) + 1,
      segmentKind: "gate_opening",
      panelWidthMm: 1000,
      targetHeightMm: 1800,
      gateProductCode: GATE_PRODUCT_CODE,
      variables: {
        [GATE_SEGMENT_STUB_KEYS.hingeType]: "dd-kwik-fit-fixed",
        [GATE_SEGMENT_STUB_KEYS.latchType]: "dd-magna-latch-top-pull",
      },
    };
    upsertSegment(runId, segment);
  }

  function updateGeometry(
    runId: string,
    seg: CanonicalSegment,
    key: "panelWidthMm" | "targetHeightMm",
    value: number,
  ) {
    upsertSegment(runId, { ...seg, [key]: value });
  }

  function setTerminationKind(
    runId: string,
    seg: CanonicalSegment,
    side: "left" | "right",
    kind: TerminationKindUi | "",
  ) {
    const kindKey =
      side === "left"
        ? SEGMENT_TERMINATION_KEYS.leftKind
        : SEGMENT_TERMINATION_KEYS.rightKind;
    const degKey =
      side === "left"
        ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees
        : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
    const subKey =
      side === "left"
        ? SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype
        : SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype;

    const patch: Record<string, string | number | boolean | null> = {
      [kindKey]: kind || null,
    };
    if (kind !== "corner") {
      patch[degKey] = null;
    }
    if (kind !== "non_system_termination") {
      patch[subKey] = null;
    }
    if (kind === "corner" && seg.variables?.[degKey] == null) {
      patch[degKey] = 90;
    }
    if (kind === "non_system_termination" && seg.variables?.[subKey] == null) {
      patch[subKey] = "wall";
    }
    upsertSegment(runId, patchSegmentVariables(seg, patch));
  }

  function setTerminationScalar(
    runId: string,
    seg: CanonicalSegment,
    key: string,
    value: string | number | boolean | null,
  ) {
    upsertSegment(runId, patchSegmentVariables(seg, { [key]: value }));
  }

  function mergedJobDisplay(seg: CanonicalSegment) {
    const out: Record<string, string | number | boolean> = {
      ...payload!.variables,
      ...(seg.variables ?? {}),
    };
    return out;
  }

  function onJobOverrideChange(
    runId: string,
    seg: CanonicalSegment,
    key: string,
    value: string | number | boolean,
  ) {
    const base = payload!.variables[key];
    const patch: Record<string, string | number | boolean | null> = {
      [key]: value === base ? null : value,
    };
    upsertSegment(runId, patchSegmentVariables(seg, patch));
  }

  function toggleExpanded(segmentId: string) {
    setExpandedId((id) => (id === segmentId ? null : segmentId));
  }

  return (
    <div className="space-y-4">
      {payload.runs.map((run, runIdx) => (
        <div
          key={run.runId}
          className="border border-brand-border rounded-lg p-4 bg-brand-card"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-brand-text">
              Run {runIdx + 1} — {run.productCode}
            </h3>
          </div>

          <div className="flex flex-wrap gap-3 mb-3 text-xs text-brand-muted">
            <span>Run left: {run.leftBoundary.type.replace(/_/g, " ")}</span>
            <span>Run right: {run.rightBoundary.type.replace(/_/g, " ")}</span>
            <span>Corners: {run.corners.length}</span>
            <span>Segments: {run.segments.length}</span>
            <span>Total length: {calcTotalLength(run)}mm</span>
          </div>

          {run.segments.length === 0 && (
            <p className="text-xs text-brand-muted italic mb-3">
              No segments yet. Draw on canvas or add manually.
            </p>
          )}

          <div className="space-y-2">
            {run.segments.map((seg, segIdx) => {
              const gate = isGateSegment(seg);
              const open = expandedId === seg.segmentId;
              const v = seg.variables ?? {};

              return (
                <div
                  key={seg.segmentId}
                  className="rounded border border-brand-border/50 bg-brand-bg text-xs overflow-hidden"
                >
                  <div className="flex gap-2 items-center p-2">
                    <span className="text-brand-muted w-8 shrink-0">
                      #{segIdx + 1}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                        gate
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-brand-accent/10 text-brand-accent border border-brand-accent/25"
                      }`}
                    >
                      {gate ? "Gate" : "Segment"}
                    </span>
                    <label className="text-brand-muted shrink-0">W:</label>
                    <input
                      type="number"
                      value={seg.panelWidthMm ?? 0}
                      onChange={(e) =>
                        updateGeometry(
                          run.runId,
                          seg,
                          "panelWidthMm",
                          Number(e.target.value),
                        )
                      }
                      className="w-20 bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
                    />
                    <span className="text-brand-muted">mm</span>
                    <label className="text-brand-muted shrink-0">H:</label>
                    <input
                      type="number"
                      value={seg.targetHeightMm ?? 1800}
                      onChange={(e) =>
                        updateGeometry(
                          run.runId,
                          seg,
                          "targetHeightMm",
                          Number(e.target.value),
                        )
                      }
                      className="w-20 bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
                    />
                    <span className="text-brand-muted">mm</span>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(seg.segmentId)}
                      className="ml-1 p-1 rounded text-brand-muted hover:text-brand-text hover:bg-brand-border/50"
                      aria-expanded={open}
                      aria-label={open ? "Collapse details" : "Expand details"}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "REMOVE_SEGMENT",
                          runId: run.runId,
                          segmentId: seg.segmentId,
                        })
                      }
                      className="ml-auto text-red-400 hover:text-red-300 text-xs p-1"
                    >
                      &#x2715;
                    </button>
                  </div>

                  {open && (
                    <div className="border-t border-brand-border/50 p-3 space-y-4 bg-brand-card/40">
                      {!gate && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-brand-muted">Bay width (mm)</span>
                              <input
                                type="number"
                                value={
                                  (v[SEGMENT_OPTION_KEYS.bayWidthMm] as number) ??
                                  ""
                                }
                                onChange={(e) =>
                                  setTerminationScalar(
                                    run.runId,
                                    seg,
                                    SEGMENT_OPTION_KEYS.bayWidthMm,
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                  )
                                }
                                className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-brand-muted">Post type</span>
                              <input
                                type="text"
                                value={
                                  (v[SEGMENT_OPTION_KEYS.postType] as string) ?? ""
                                }
                                onChange={(e) =>
                                  setTerminationScalar(
                                    run.runId,
                                    seg,
                                    SEGMENT_OPTION_KEYS.postType,
                                    e.target.value || null,
                                  )
                                }
                                className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-brand-muted">Post width (mm)</span>
                              <input
                                type="number"
                                value={
                                  (v[SEGMENT_OPTION_KEYS.postWidthMm] as number) ??
                                  ""
                                }
                                onChange={(e) =>
                                  setTerminationScalar(
                                    run.runId,
                                    seg,
                                    SEGMENT_OPTION_KEYS.postWidthMm,
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                  )
                                }
                                className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                              />
                            </label>
                          </div>

                          {jobFields.length > 0 && (
                            <div>
                              <p className="text-brand-muted mb-2 font-medium">
                                Job settings override (this segment)
                              </p>
                              <SchemaDrivenForm
                                fields={jobFields}
                                variables={mergedJobDisplay(seg)}
                                onChange={(key, value) => {
                                  if (!jobFieldKeys.has(key)) return;
                                  onJobOverrideChange(run.runId, seg, key, value);
                                }}
                              />
                            </div>
                          )}

                          {(["left", "right"] as const).map((side) => {
                            const kindKey =
                              side === "left"
                                ? SEGMENT_TERMINATION_KEYS.leftKind
                                : SEGMENT_TERMINATION_KEYS.rightKind;
                            const degKey =
                              side === "left"
                                ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees
                                : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
                            const subKey =
                              side === "left"
                                ? SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype
                                : SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype;
                            const kind = (v[kindKey] as TerminationKindUi) ?? "";
                            const sub = (v[subKey] as NonSystemSubtypeUi) ?? "wall";

                            return (
                              <div
                                key={side}
                                className="border border-brand-border/40 rounded-md p-3 space-y-2"
                              >
                                <p className="text-brand-text font-medium capitalize">
                                  {side} termination
                                </p>
                                <label className="flex flex-col gap-1 max-w-xs">
                                  <span className="text-brand-muted">Type</span>
                                  <select
                                    value={kind}
                                    onChange={(e) =>
                                      setTerminationKind(
                                        run.runId,
                                        seg,
                                        side,
                                        e.target.value as TerminationKindUi | "",
                                      )
                                    }
                                    className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                                  >
                                    <option value="">Inherit run default</option>
                                    <option value="corner">Corner</option>
                                    <option value="system_post">System post</option>
                                    <option value="non_system_termination">
                                      Non-system termination
                                    </option>
                                  </select>
                                </label>
                                {kind === "corner" && (
                                  <label className="flex flex-col gap-1 max-w-xs">
                                    <span className="text-brand-muted">
                                      Corner angle (°)
                                    </span>
                                    <select
                                      value={Number(v[degKey] ?? 90)}
                                      onChange={(e) =>
                                        setTerminationScalar(
                                          run.runId,
                                          seg,
                                          degKey,
                                          Number(e.target.value),
                                        )
                                      }
                                      className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                                    >
                                      {CORNER_DEGREE_OPTIONS.map((d) => (
                                        <option key={d} value={d}>
                                          {d}°
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                )}
                                {kind === "non_system_termination" && (
                                  <label className="flex flex-col gap-1 max-w-xs">
                                    <span className="text-brand-muted">
                                      Non-system type
                                    </span>
                                    <select
                                      value={sub}
                                      onChange={(e) =>
                                        setTerminationScalar(
                                          run.runId,
                                          seg,
                                          subKey,
                                          e.target.value as NonSystemSubtypeUi,
                                        )
                                      }
                                      className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                                    >
                                      <option value="wall">Wall</option>
                                      <option value="non_system_post">
                                        Non-system post
                                      </option>
                                    </select>
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {gate && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <p className="sm:col-span-2 text-brand-muted text-[11px]">
                            Gate hardware (full QS_GATE form will be data-driven
                            here later).
                          </p>
                          <label className="flex flex-col gap-1">
                            <span className="text-brand-muted">Hinge type</span>
                            <input
                              type="text"
                              value={
                                (v[GATE_SEGMENT_STUB_KEYS.hingeType] as string) ??
                                ""
                              }
                              onChange={(e) =>
                                setTerminationScalar(
                                  run.runId,
                                  seg,
                                  GATE_SEGMENT_STUB_KEYS.hingeType,
                                  e.target.value || null,
                                )
                              }
                              className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-brand-muted">Latch type</span>
                            <input
                              type="text"
                              value={
                                (v[GATE_SEGMENT_STUB_KEYS.latchType] as string) ??
                                ""
                              }
                              onChange={(e) =>
                                setTerminationScalar(
                                  run.runId,
                                  seg,
                                  GATE_SEGMENT_STUB_KEYS.latchType,
                                  e.target.value || null,
                                )
                              }
                              className="bg-brand-bg border border-brand-border rounded px-2 py-1 text-brand-text"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-3">
            <Button
              onClick={() => addFenceSegment(run.runId)}
              icon={Plus}
              variant="ghost"
              size="small"
            >
              Add segment
            </Button>
            <Button
              onClick={() => addGateSegment(run.runId)}
              icon={Plus}
              variant="ghost"
              size="small"
            >
              Add gate
            </Button>
            <Button
              onClick={() => {
                dispatch({ type: "REMOVE_RUN", runId: run.runId });
              }}
              icon={Trash2}
              variant="ghost-danger"
              size="small"
            >
              Remove run
            </Button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const newRun: CanonicalRun = {
            runId: crypto.randomUUID(),
            productCode: payload.productCode,
            leftBoundary: { type: "product_post" },
            rightBoundary: { type: "product_post" },
            segments: [],
            corners: [],
          };
          dispatch({ type: "UPSERT_RUN", run: newRun });
        }}
        className="w-full text-sm text-brand-muted border border-dashed border-brand-border rounded-lg py-3 hover:border-brand-accent/50 hover:text-brand-accent transition-colors"
      >
        + Add run
      </button>
    </div>
  );
}
