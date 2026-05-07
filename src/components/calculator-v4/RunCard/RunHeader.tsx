import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  StretchVertical,
  GalleryHorizontalEnd,
  CornerDownRight,
  Route,
  Tag,
  RulerDimensionLine,
  DoorOpen,
  Fence,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Tooltip } from "../../ui/Tooltip";
import type { RunSummary } from "./useRunSummary";
import { cn } from "../../../lib";
import { RUN_LINE_COLORS } from "../../../lib/runLineColors";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";

interface Props {
  runId: string;
  index: number;
  /** Same palette index as canvas run stroke / segment rows */
  runColorIndex: number;
  displayName?: string;
  systemCode: string;
  summary: RunSummary;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** When set, show per-run fence system control (if multiple products exist). */
  showProductSelect?: boolean;
  /** Always visible (including collapsed) — matches RunActions remove when expanded */
  onRemoveRun: () => void;
  canRemoveRun: boolean;
}

const ICON = 12;

function Stat({
  icon: Icon,
  tooltip,
  ariaLabel,
  unitLabel,
  children,
  className,
}: {
  icon: LucideIcon;
  tooltip: string;
  ariaLabel: string;
  /** Visible noun after the number (length stat omits — already shows "m") */
  unitLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip content={tooltip}>
      <span
        className="inline-flex items-center gap-1 cursor-default text-xs text-brand-muted"
        aria-label={ariaLabel}
      >
        <Icon
          size={ICON}
          className={cn("shrink-0 text-brand-muted", className)}
          aria-hidden
        />
        <span className="font-mono tabular-nums">{children}</span>
        {unitLabel ? (
          <span className="text-brand-muted hidden min-[380px]:inline">
            {unitLabel}
          </span>
        ) : null}
      </span>
    </Tooltip>
  );
}

export function RunHeader({
  runId,
  index,
  runColorIndex,
  displayName,
  systemCode,
  summary,
  expanded,
  onToggleExpanded,
  onRemoveRun,
  canRemoveRun,
}: Props) {
  const { dispatch } = useCalculatorV4();

  const len = summary.totalLengthM.toFixed(2);
  const runAccentHex =
    RUN_LINE_COLORS[runColorIndex % RUN_LINE_COLORS.length] ?? RUN_LINE_COLORS[0];
  const defaultTitle = `Run ${index}`;
  const shownTitle = displayName?.trim() || defaultTitle;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shownTitle);

  useEffect(() => {
    setDraft(shownTitle);
  }, [shownTitle]);

  function commitName() {
    setEditing(false);
    dispatch({
      type: "SET_RUN_DISPLAY_NAME",
      runId,
      displayName: draft,
    });
  }


  const stats = [
    {
      icon: RulerDimensionLine,
      tooltip: "Total length along this run",
      ariaLabel: `Total length along this run: ${len} metres`,
      value: len,
      unit: "m",
    },

    {
      icon: Fence,
      tooltip: "Fence segments (spans) in this run",
      ariaLabel: `Fence segments: ${summary.fenceSegmentCount}`,
      value: summary.fenceSegmentCount,
      unit: "spans",
    },

    {
      icon: DoorOpen,
      tooltip: "Gates in this run",
      ariaLabel: `Gates: ${summary.gateCount}`,
      value: summary.gateCount,
      unit: "gates",
    },

    {
      icon: GalleryHorizontalEnd,
      tooltip: "Number of panels",
      ariaLabel: `Panels: ${summary.panelCount}`,
      value: summary.panelCount,
      unit: "panels",
    },

    {
      icon: StretchVertical,
      tooltip: "Number of posts",
      ariaLabel: `Posts: ${summary.postCount}`,
      value: summary.postCount,
      unit: "posts",
    },

    {
      icon: CornerDownRight,
      tooltip: "Number of corners",
      ariaLabel: `Corners: ${summary.cornerCount}`,
      value: summary.cornerCount,
      unit: "corners",
    },



  ]

  return (
    <div className="px-4 py-3 flex items-center gap-3 ">
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="shrink-0 p-1 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/40 transition-colors"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse run" : "Expand run"}
        >
          {expanded ? (
            <ChevronDown size={18} aria-hidden />
          ) : (
            <ChevronRight size={18} aria-hidden />
          )}
        </button>

        <Tooltip content="Fence run — click the title to rename">
          <div className="inline-flex items-center gap-1.5 min-w-0">
            <Route
              size={16}
              className="shrink-0"
              style={{ color: runAccentHex }}
              aria-hidden
            />
            {editing ? (
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setDraft(shownTitle);
                    setEditing(false);
                  }
                }}
                className="min-w-[8rem] max-w-[14rem] px-2 py-0.5 text-base font-semibold bg-brand-bg border border-brand-border rounded text-brand-text"
                autoFocus
                aria-label="Run name"
                maxLength={120}
              />
            ) : (
              <h2 className="font-semibold text-base min-w-0 truncate">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-left hover:text-brand-accent transition-colors"
                >
                  {shownTitle}
                </button>
              </h2>
            )}
          </div>
        </Tooltip>

        <Tooltip content="Fence system / product code for this run">
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-brand-accent text-brand-bg font-medium cursor-default"
            aria-label={`Fence system: ${systemCode}`}
          >
            <Tag size={ICON} className="shrink-0 opacity-90" aria-hidden />
            <span className="font-mono">{systemCode}</span>
          </span>
        </Tooltip>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {stats.filter((stat) => Number(stat.value) > 0).map((stat) => (
            <Stat
              key={stat.icon.name}
              icon={stat.icon}
              tooltip={stat.tooltip}
              ariaLabel={stat.ariaLabel}
              unitLabel={stat.unit}
            >
              {stat.value}
            </Stat>
          ))}

        </div>
      </div>

      <Tooltip
        content={
          canRemoveRun
            ? "Remove this run"
            : "Cannot remove the last run — add another run first"
        }
      >
        <button
          type="button"
          onClick={onRemoveRun}
          disabled={!canRemoveRun}
          className="shrink-0 p-2 rounded-md text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Remove run"
          data-testid="v4-remove-run-header"
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </Tooltip>
    </div>
  );
}
