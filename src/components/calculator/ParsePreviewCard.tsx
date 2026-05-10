import { useState } from "react";
import type { Confidence, ParseResult, ParsedGate, ParsedSystemType } from "../../lib/describeFenceParser";

type EditableKey =
  | "systemType"
  | "runLengthMm"
  | "heightMm"
  | "slatSizeMm"
  | "gapMm"
  | "colourCode"
  | "mountingMethod"
  | "termination"
  | "cornerCount";

const LABELS: Record<EditableKey | "gates", string> = {
  systemType: "System",
  runLengthMm: "Run length",
  heightMm: "Height",
  slatSizeMm: "Slat",
  gapMm: "Gap",
  colourCode: "Colour",
  mountingMethod: "Mounting",
  termination: "Ends",
  cornerCount: "Corners",
  gates: "Gates",
};

const SYSTEMS: ParsedSystemType[] = ["QSHS", "VS", "XPL", "BAYG", "SLIDING", "PEDESTRIAN"];
const COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"] as const;

function chipClass(confidence: Confidence) {
  if (confidence === "missing") {
    return "border-brand-warning text-brand-warning bg-transparent";
  }
  if (confidence === "default") {
    return "border-transparent bg-brand-bg text-brand-muted italic";
  }
  if (confidence === "inferred") {
    return "border-brand-border bg-brand-bg text-brand-text";
  }
  return "border-brand-border bg-brand-card text-brand-text";
}

function valueLabel(key: EditableKey | "gates", value: unknown) {
  if (value === undefined || value === null || value === "") return "Missing";
  if (key === "runLengthMm") return `${(Number(value) / 1000).toFixed(2)}m`;
  if (key === "heightMm" || key === "slatSizeMm" || key === "gapMm") return `${value}mm`;
  if (key === "gates") {
    const gates = value as ParsedGate[];
    return gates.length ? gates.map((gate) => gate.kind.replace("_", " ")).join(", ") : "No gates";
  }
  return String(value).replace(/_/g, " ");
}

function withAttr(result: ParseResult, key: EditableKey, value: string): ParseResult {
  const next = { ...result, attributes: { ...result.attributes } };
  if (key === "runLengthMm" || key === "heightMm") {
    next.attributes[key] = { value: Math.round(Number(value) * 1000), confidence: "stated" };
  } else if (key === "slatSizeMm") {
    next.attributes.slatSizeMm = { value: Number(value) as 65 | 90, confidence: "stated" };
  } else if (key === "gapMm") {
    next.attributes.gapMm = { value: Number(value) as 5 | 9 | 20, confidence: "stated" };
  } else if (key === "cornerCount") {
    next.attributes.cornerCount = { value: Math.max(0, Math.round(Number(value))), confidence: "stated" };
  } else if (key === "systemType") {
    next.attributes.systemType = { value: value as ParsedSystemType, confidence: "stated" };
  } else if (key === "colourCode") {
    next.attributes.colourCode = { value: value as ParseResult["attributes"]["colourCode"] extends { value: infer T } ? T : never, confidence: "stated" };
  } else if (key === "mountingMethod") {
    next.attributes.mountingMethod = { value: value as "concreted" | "base_plated" | "core_drilled", confidence: "stated" };
  } else if (key === "termination") {
    next.attributes.termination = { value: value as "post_post" | "post_wall" | "wall_wall", confidence: "stated" };
  }
  return next;
}

function optionsFor(key: EditableKey) {
  if (key === "systemType") return SYSTEMS;
  if (key === "slatSizeMm") return ["65", "90"];
  if (key === "gapMm") return ["5", "9", "20"];
  if (key === "colourCode") return COLOURS;
  if (key === "mountingMethod") return ["concreted", "base_plated", "core_drilled"];
  if (key === "termination") return ["post_post", "post_wall", "wall_wall"];
  return null;
}

export function ParsePreviewCard({
  result,
  onChange,
  onApply,
  onEdit,
  onClear,
}: {
  result: ParseResult;
  onChange: (result: ParseResult) => void;
  onApply: (result: ParseResult) => void;
  onEdit: () => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState<EditableKey | null>(null);
  const rows: EditableKey[] = [
    "systemType",
    "runLengthMm",
    "heightMm",
    "slatSizeMm",
    "gapMm",
    "colourCode",
    "mountingMethod",
    "termination",
    "cornerCount",
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-brand-border bg-brand-card p-3 text-sm shadow-sm">
      <div className="grid gap-2">
        {rows.map((key) => {
          const item = result.attributes[key];
          const confidence = item?.confidence ?? "missing";
          const options = optionsFor(key);
          return (
            <div key={key} className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-center">
              <span className="text-xs font-extrabold uppercase tracking-wide text-brand-muted">{LABELS[key]}</span>
              <button
                type="button"
                onClick={() => setEditing((value) => (value === key ? null : key))}
                className={`inline-flex min-h-9 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold ${chipClass(confidence)}`}
              >
                <span>{confidence === "inferred" ? "~ " : ""}{valueLabel(key, item?.value)}</span>
                <span className="text-[10px] uppercase">{confidence === "missing" ? "+ pick" : confidence}</span>
              </button>
              {editing === key && (
                <div className="sm:col-start-2">
                  {options ? (
                    <select
                      value={String(item?.value ?? "")}
                      onChange={(event) => {
                        onChange(withAttr(result, key, event.target.value));
                        setEditing(null);
                      }}
                      className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-text"
                    >
                      <option value="">Choose...</option>
                      {options.map((option) => (
                        <option key={option} value={option}>{String(option).replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step={key === "cornerCount" ? 1 : 0.1}
                      defaultValue={
                        key === "runLengthMm" || key === "heightMm"
                          ? item?.value
                            ? Number(item.value) / 1000
                            : ""
                          : item?.value ?? ""
                      }
                      onBlur={(event) => {
                        if (event.target.value) onChange(withAttr(result, key, event.target.value));
                        setEditing(null);
                      }}
                      className="w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-text"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {result.attributes.gates?.value.length ? (
          <div className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:items-center">
            <span className="text-xs font-extrabold uppercase tracking-wide text-brand-muted">{LABELS.gates}</span>
            <span className={`rounded-lg border px-3 py-2 text-xs font-bold ${chipClass(result.attributes.gates.confidence)}`}>
              {valueLabel("gates", result.attributes.gates.value)}
            </span>
          </div>
        ) : null}
      </div>
      {result.unparsed.length > 0 && (
        <p className="text-xs font-semibold text-brand-muted">Unparsed: {result.unparsed.join(", ")}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onApply(result)}
          className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-black text-white hover:bg-brand-primary/90"
        >
          Apply to calculator
        </button>
        <button type="button" onClick={onEdit} className="rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted hover:text-brand-primary">
          Edit description
        </button>
        <button type="button" onClick={onClear} className="text-xs font-bold text-brand-muted hover:text-brand-danger">
          Clear
        </button>
      </div>
    </div>
  );
}
