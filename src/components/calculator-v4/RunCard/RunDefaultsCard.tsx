import { Settings2 } from "lucide-react";
import { COLOUR_HEX } from "../../../lib/colourHex";

interface Props {
  productCode: string;
  effectiveVars: Record<string, string | number | boolean>;
  onEdit: () => void;
  isBayg?: boolean;
}

const DEFAULT_FIELDS: Array<{
  key: string;
  label: string;
  suffix?: string;
}> = [
  { key: "finish_family", label: "Slat range" },
  { key: "colour_code", label: "Colour" },
  { key: "slat_size_mm", label: "Slat size", suffix: "mm" },
  { key: "slat_gap_mm", label: "Slat gap", suffix: "mm" },
  { key: "mounting_type", label: "Post mounting" },
  { key: "post_size", label: "Post size" },
  { key: "max_panel_width_mm", label: "Max post spacing", suffix: "mm" },
];

function formatValue(
  key: string,
  value: string | number | boolean | undefined,
  suffix?: string,
) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (suffix && Number.isFinite(Number(value))) return `${value}${suffix}`;
  if (key === "finish_family") return String(value).replace(/_/g, " ");
  if (key === "mounting_type") return String(value).replace(/_/g, " ");
  return String(value);
}

export function RunDefaultsCard({
  productCode,
  effectiveVars,
  onEdit,
  isBayg = false,
}: Props) {
  const colourCode = String(effectiveVars.colour_code ?? "");
  const colourHex = COLOUR_HEX[colourCode];
  const fields = isBayg
    ? DEFAULT_FIELDS.filter(
        (field) =>
          !["mounting_type", "post_size", "max_panel_width_mm"].includes(
            field.key,
          ),
      )
    : DEFAULT_FIELDS;

  return (
    <div
      className="rounded-lg border border-brand-border/70 bg-brand-bg/50 px-3 py-2"
      data-testid="v4-run-defaults-card"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Run defaults
          </div>
          <p className="text-[11px] text-brand-muted">
            {isBayg
              ? "New panels inherit these settings until a panel override is set."
              : "New segments inherit these settings until a segment override is set."}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 text-xs font-medium text-brand-text hover:border-brand-accent hover:text-brand-accent"
        >
          <Settings2 size={14} />
          Edit defaults
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-brand-muted">System type</dt>
          <dd className="font-mono font-semibold text-brand-text">
            {productCode}
          </dd>
        </div>
        {fields.map((field) => (
          <div key={field.key} className="min-w-0">
            <dt className="text-brand-muted">{field.label}</dt>
            <dd className="flex min-w-0 items-center gap-1.5 font-semibold text-brand-text">
              {field.key === "colour_code" && colourHex ? (
                <span
                  className="size-2.5 shrink-0 rounded-sm ring-1 ring-black/20"
                  style={{ backgroundColor: colourHex }}
                />
              ) : null}
              <span className="truncate">
                {formatValue(
                  field.key,
                  effectiveVars[field.key],
                  field.suffix,
                )}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
