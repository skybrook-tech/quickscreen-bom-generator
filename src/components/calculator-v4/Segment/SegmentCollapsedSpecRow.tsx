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

const Chip = ({ children, locked }: { children: React.ReactNode, locked: boolean }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--brand-radius-sm)] gap-1 px-1.5 py-0.5 tabular-nums cursor-default max-w-full",
        locked
          ? "bg-white/25 text-white"
          : "bg-black/[0.06] dark:bg-white/10 text-brand-text",
      )}
    >
      {children}
    </span>
  );
};

export function SegmentCollapsedSpecRow({
  colour,
  showColourSwatch,
  chips,
  locked,
}: Props) {
  return (
    <div
      className={cn(
        "pl-7 pr-3 pt-0 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] leading-snug",
        locked ? "text-white/80" : "text-brand-muted",
      )}
    >
      {showColourSwatch && colour ? (
        <Chip locked={locked}>
          <span
            className={cn(
              "inline-block size-3.5 rounded-[var(--brand-radius-sm)] shrink-0 ring-1 ring-inset",
              locked ? "ring-white/50" : "ring-black/20",
            )}
            style={{ backgroundColor: colour.hex ?? "#888" }}
            title={colour.label}
          />

          <span
            className={cn(
              "truncate max-w-[10rem]",
              locked ? "text-white" : "text-brand-text",
            )}
          >
            {colour.label}
          </span>
        </Chip>
      ) : null}

      {chips.map((c) => (
        <Tooltip key={c.id} content={c.tooltip}>
          <Chip locked={locked}>

            {c.chipText}
          </Chip>
        </Tooltip>
      ))}
    </div>
  );
}
