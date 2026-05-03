import { Tooltip } from "../../ui/Tooltip";
import type {
  CollapsedColourSwatch,
  CollapsedSpecChip,
} from "../../../lib/segmentCollapsedSpecs";
import { cn } from "../../../lib";

interface Props {
  colour: CollapsedColourSwatch | null;
  showColourSwatch: boolean;
  chips: CollapsedSpecChip[];
  /** Matches segment confirmed / locked header styling */
  locked: boolean;
}

export function SegmentCollapsedSpecRow({
  colour,
  showColourSwatch,
  chips,
  locked,
}: Props) {
  return (
    <div
      className={cn(
        "pl-7 pr-3 pb-2.5 pt-0 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] leading-snug",
        locked ? "text-white/80" : "text-neutral-500",
      )}
    >
      {showColourSwatch && colour ? (
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "inline-block size-3.5 rounded-sm shrink-0 ring-1 ring-inset",
              locked ? "ring-white/40" : "ring-black/20",
            )}
            style={{ backgroundColor: colour.hex ?? "#888" }}
            title={colour.label}
          />
          <span
            className={cn(
              "truncate max-w-[10rem]",
              locked ? "text-white/70" : "text-neutral-500",
            )}
          >
            {colour.label}
          </span>
        </span>
      ) : null}

      {chips.map((c) => (
        <Tooltip key={c.id} content={c.tooltip}>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 tabular-nums cursor-default max-w-full",
              locked
                ? "bg-white/15 text-white/95"
                : "bg-neutral-700/40 text-neutral-300",
            )}
          >
            {c.chipText}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}
