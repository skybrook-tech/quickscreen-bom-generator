import { useCalculator } from "../../context/CalculatorContext";
import type {
  CanonicalRun,
  CanonicalSegment,
} from "../../types/canonical.types";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../shared/Button";

export function RunListV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.canonicalPayload;
  if (!payload) return null;

  function addSegment(runId: string) {
    const run = payload!.runs.find((r) => r.runId === runId);
    const segment: CanonicalSegment = {
      segmentId: crypto.randomUUID(),
      sortOrder: (run?.segments.length ?? 0) + 1,
      segmentKind: "panel",
      panelWidthMm: 2500,
      targetHeightMm: 1800,
    };
    dispatch({ type: "UPSERT_SEGMENT", runId, segment });
  }

  function updateSegmentField(
    runId: string,
    segmentId: string,
    key: string,
    value: string | number | boolean,
  ) {
    const run = payload!.runs.find((r) => r.runId === runId);
    const seg = run?.segments.find((s) => s.segmentId === segmentId);
    if (!seg) return;
    const updated: CanonicalSegment = { ...seg, [key]: value };
    dispatch({ type: "UPSERT_SEGMENT", runId, segment: updated });
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

          <div className="flex gap-3 mb-3 text-xs text-brand-muted">
            <span>Left: {run.leftBoundary.type.replace(/_/g, " ")}</span>
            <span>Right: {run.rightBoundary.type.replace(/_/g, " ")}</span>
          </div>

          {run.segments.length === 0 && (
            <p className="text-xs text-brand-muted italic mb-3">
              No segments yet. Draw on canvas or add manually.
            </p>
          )}

          <div className="space-y-2">
            {run.segments.map((seg, segIdx) => (
              <div
                key={seg.segmentId}
                className="flex gap-2 items-center p-2 bg-brand-bg rounded border border-brand-border/50 text-xs"
              >
                <span className="text-brand-muted w-8">#{segIdx + 1}</span>
                <select
                  value={seg.segmentKind}
                  onChange={(e) =>
                    updateSegmentField(
                      run.runId,
                      seg.segmentId,
                      "segmentKind",
                      e.target.value,
                    )
                  }
                  className="bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
                >
                  <option value="panel">Panel</option>
                  <option value="bay_group">Bay Group</option>
                  <option value="gate_opening">Gate Opening</option>
                </select>
                {(seg.segmentKind === "panel" ||
                  seg.segmentKind === "gate_opening") && (
                  <>
                    <label className="text-brand-muted">W:</label>
                    <input
                      type="number"
                      value={seg.panelWidthMm ?? 2500}
                      onChange={(e) =>
                        updateSegmentField(
                          run.runId,
                          seg.segmentId,
                          "panelWidthMm",
                          Number(e.target.value),
                        )
                      }
                      className="w-20 bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
                    />
                    <span className="text-brand-muted">mm</span>
                  </>
                )}
                <label className="text-brand-muted">H:</label>
                <input
                  type="number"
                  value={seg.targetHeightMm ?? 1800}
                  onChange={(e) =>
                    updateSegmentField(
                      run.runId,
                      seg.segmentId,
                      "targetHeightMm",
                      Number(e.target.value),
                    )
                  }
                  className="w-20 bg-brand-card border border-brand-border rounded px-2 py-1 text-brand-text"
                />
                <span className="text-brand-muted">mm</span>
                <button
                  onClick={() =>
                    dispatch({
                      type: "REMOVE_SEGMENT",
                      runId: run.runId,
                      segmentId: seg.segmentId,
                    })
                  }
                  className="ml-auto text-red-400 hover:text-red-300 text-xs"
                >
                  &#x2715;
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button
              onClick={() => addSegment(run.runId)}
              icon={Plus}
              variant="ghost"
              size="small"
            >
              Add Segment
            </Button>
            <Button
              onClick={() => {
                dispatch({ type: "REMOVE_RUN", id: run.runId });
              }}
              icon={Trash2}
              variant="ghost-danger"
              size="small"
            >
              Remove Run
            </Button>
          </div>
        </div>
      ))}

      <button
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
        + Add Run
      </button>
    </div>
  );
}
