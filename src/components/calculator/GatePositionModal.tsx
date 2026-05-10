import { useState } from "react";

export function GatePositionModal({
  gateLabel,
  runLengthMm,
  widthMm,
  onConfirm,
  onClose,
}: {
  gateLabel: string;
  runLengthMm: number;
  widthMm: number;
  onConfirm: (distanceFromStartMm: number) => void;
  onClose: () => void;
}) {
  const min = Math.round(widthMm / 2);
  const max = Math.max(min, runLengthMm - Math.round(widthMm / 2));
  const [value, setValue] = useState(Math.min(max, Math.max(min, Math.round(runLengthMm / 2))));
  const snapped = Math.round(value / 100) * 100;
  const invalid = snapped < min || snapped > max;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-brand-text">Where is the gate in this run?</h2>
            <p className="text-sm font-semibold text-brand-muted">{gateLabel} - opening {widthMm}mm</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-brand-border px-2 py-1 text-xs font-bold text-brand-muted">
            Close
          </button>
        </div>
        <div className="mb-4 rounded-xl border border-brand-border bg-brand-bg p-4">
          <div className="relative h-5 rounded-full bg-brand-border">
            <div
              className="absolute top-1/2 h-9 w-4 -translate-y-1/2 rounded bg-brand-primary shadow-md"
              style={{ left: `${Math.min(100, Math.max(0, (snapped / runLengthMm) * 100))}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={runLengthMm}
            step={100}
            value={snapped}
            onChange={(event) => setValue(Number(event.target.value))}
            className="mt-5 w-full accent-brand-primary"
          />
        </div>
        <label className="block text-sm font-bold text-brand-muted">
          Distance from start (m)
          <input
            type="number"
            step={0.1}
            value={(snapped / 1000).toFixed(1)}
            onChange={(event) => setValue(Math.round(Number(event.target.value) * 1000))}
            className="mt-1 w-full rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-brand-text"
          />
        </label>
        {invalid && (
          <p className="mt-3 rounded-lg border border-brand-warning/40 bg-brand-warning/10 px-3 py-2 text-sm font-bold text-brand-warning">
            Gate would extend past the run. Move it between {(min / 1000).toFixed(1)}m and {(max / 1000).toFixed(1)}m.
          </p>
        )}
        <button
          type="button"
          disabled={invalid}
          onClick={() => onConfirm(snapped)}
          className="mt-4 w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm position
        </button>
      </div>
    </div>
  );
}
