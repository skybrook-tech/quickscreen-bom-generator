import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import {
  COLOURS,
  SLAT_SIZES,
  SLAT_GAPS,
  PANEL_WIDTHS,
  TERMINATIONS,
  POST_MOUNTINGS,
} from "../../lib/constants";
import type { RunConfig } from "../../schemas/calculator.schema";

interface RunItemProps {
  run: RunConfig;
  index: number;
}

export function RunItem({ run, index }: RunItemProps) {
  const { state, dispatch } = useCalculator();
  const [expanded, setExpanded] = useState(false);

  const { productOptions, defaults } = state;

  const resolvedColour = run.colour ?? defaults.colour;
  const resolvedSlatSize = run.slatSize ?? defaults.slatSize;
  const resolvedGap = run.slatGap ?? defaults.slatGap;
  const resolvedPanelWidth = run.maxPanelWidth;
  const resolvedLeftTerm = run.leftTermination;
  const resolvedRightTerm = run.rightTermination;
  const resolvedMounting = run.postMounting;
  const resolvedCorners = run.corners;

  const colourLabel =
    COLOURS.find((c) => c.value === resolvedColour)?.label ?? resolvedColour;
  const mountingLabel =
    POST_MOUNTINGS.find((m) => m.value === resolvedMounting)?.label ??
    resolvedMounting;

  const hasOverrides =
    run.slatSize !== null || run.slatGap !== null || run.colour !== null;

  const availableSlatSizes = (productOptions?.slatSize ?? ["65", "90"]).map(
    (v) => SLAT_SIZES.find((s) => s.value === v)!,
  ).filter(Boolean);
  const availableSlatGaps = (productOptions?.slatGap ?? ["5", "9", "20"]).map(
    (v) => SLAT_GAPS.find((s) => s.value === v)!,
  ).filter(Boolean);
  const availableColours = (productOptions?.colour ?? []).map(
    (v) => COLOURS.find((c) => c.value === v)!,
  ).filter(Boolean);

  const update = (field: keyof RunConfig, value: unknown) => {
    dispatch({ type: "UPDATE_RUN", id: run.id, updates: { [field]: value } });
  };

  return (
    <div className="border border-brand-border rounded-lg overflow-hidden">
      {/* ── Collapsed row ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-bg/40">
        <span className="text-xs font-semibold text-brand-accent w-12 shrink-0">
          Run {index + 1}
        </span>

        {/* Inline dimension inputs */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={run.length}
            onChange={(e) => update("length", parseFloat(e.target.value) || 0)}
            min={0.5}
            max={100}
            step={0.1}
            className="w-16 px-1.5 py-1 bg-brand-card border border-brand-border rounded text-sm text-brand-text text-right"
          />
          <span className="text-xs text-brand-muted">m</span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={run.targetHeight}
            onChange={(e) =>
              update("targetHeight", parseInt(e.target.value) || 0)
            }
            min={300}
            max={2400}
            step={50}
            className="w-20 px-1.5 py-1 bg-brand-card border border-brand-border rounded text-sm text-brand-text text-right"
          />
          <span className="text-xs text-brand-muted">mm</span>
        </div>

        {/* Summary text */}
        <span className="text-xs text-brand-muted truncate flex-1 hidden sm:inline">
          {resolvedSlatSize}mm · {resolvedGap}mm gap · {colourLabel}
          {hasOverrides && (
            <span className="text-amber-400 ml-1" title="Has overrides">
              *
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-brand-muted hover:text-brand-text transition-colors"
            title={expanded ? "Collapse" : "More options"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "REMOVE_RUN", id: run.id })}
            className="p-1.5 text-brand-muted hover:text-red-400 transition-colors"
            title="Remove run"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Expanded options ── */}
      {expanded && (
        <div className="px-4 py-4 border-t border-brand-border bg-brand-bg/20 space-y-4">
          {/* Panel width */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Panel Width
              </label>
              <select
                value={resolvedPanelWidth}
                onChange={(e) =>
                  update("maxPanelWidth", e.target.value as "2600" | "2000")
                }
                className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
              >
                {PANEL_WIDTHS.map((pw) => (
                  <option key={pw.value} value={pw.value}>
                    {pw.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Corners
              </label>
              <input
                type="number"
                value={resolvedCorners}
                onChange={(e) =>
                  update("corners", parseInt(e.target.value) || 0)
                }
                min={0}
                max={10}
                className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Left End
              </label>
              <select
                value={resolvedLeftTerm}
                onChange={(e) =>
                  update("leftTermination", e.target.value as "post" | "wall")
                }
                className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
              >
                {TERMINATIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Right End
              </label>
              <select
                value={resolvedRightTerm}
                onChange={(e) =>
                  update("rightTermination", e.target.value as "post" | "wall")
                }
                className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
              >
                {TERMINATIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">
              Post Mounting
            </label>
            <select
              value={resolvedMounting}
              onChange={(e) =>
                update(
                  "postMounting",
                  e.target.value as RunConfig["postMounting"],
                )
              }
              className="w-full sm:w-1/2 px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
            >
              {POST_MOUNTINGS.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          {/* Overrides */}
          <fieldset className="border border-brand-border/50 rounded-lg p-3">
            <legend className="text-xs font-medium text-brand-muted px-1">
              Overrides
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1">
                  Slat Size
                </label>
                <select
                  value={run.slatSize ?? ""}
                  onChange={(e) => update("slatSize", e.target.value || null)}
                  className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
                >
                  <option value="">Default ({defaults.slatSize}mm)</option>
                  {availableSlatSizes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1">
                  Slat Gap
                </label>
                <select
                  value={run.slatGap ?? ""}
                  onChange={(e) => update("slatGap", e.target.value || null)}
                  className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
                >
                  <option value="">Default ({defaults.slatGap}mm)</option>
                  {availableSlatGaps.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1">
                  Colour
                </label>
                <select
                  value={run.colour ?? ""}
                  onChange={(e) => update("colour", e.target.value || null)}
                  className="w-full px-2 py-1.5 bg-brand-card border border-brand-border rounded text-sm text-brand-text"
                >
                  <option value="">Default</option>
                  {availableColours.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                      {c.limited ? " ⚠" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Collapsed summary when expanded — show resolved mounting */}
          <p className="text-xs text-brand-muted">
            {mountingLabel} · {resolvedLeftTerm} / {resolvedRightTerm} ends ·{" "}
            {resolvedCorners} corner{resolvedCorners !== 1 ? "s" : ""} ·{" "}
            {resolvedPanelWidth}mm panels
          </p>
        </div>
      )}
    </div>
  );
}
