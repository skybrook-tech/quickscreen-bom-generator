import { COLOUR_HEX } from "../../../lib/colourHex";

interface Props {
  effectiveVars: Record<string, string | number | boolean>;
}

/** Read-only strip of master fence specs (mirrored in run.variables). */
export function RunSubHeader({ effectiveVars }: Props) {
  const colourCode = String(effectiveVars["colour_code"] ?? "");
  const colourHex = COLOUR_HEX[colourCode];

  return (
    <div className="flex items-center min-h-[40px]">
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-neutral-500 font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            {colourHex && (
              <span
                className="w-2.5 h-2.5 rounded-sm ring-1 ring-neutral-700"
                style={{ backgroundColor: colourHex }}
              />
            )}
            {colourCode || "—"}
          </span>
          <span>·</span>
          <span>{String(effectiveVars["slat_size_mm"] ?? "—")}mm slat</span>
          <span>·</span>
          <span>{String(effectiveVars["slat_gap_mm"] ?? "—")}mm gap</span>
          <span>·</span>
          <span>{String(effectiveVars["mounting_type"] ?? "—")}</span>
        </div>
      </div>
    </div>
  );
}
