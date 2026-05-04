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
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Tooltip } from "../../ui/Tooltip";
import type { RunSummary } from "./useRunSummary";
import { cn } from "../../../lib";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProducts } from "../../../hooks/useProducts";
import { ProductSelectV4 } from "../JobShell/ProductSelectV4";

interface Props {
  runId: string;
  index: number;
  displayName?: string;
  systemCode: string;
  summary: RunSummary;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** When false, show shorter stats row (length + segment count only). */
  compact?: boolean;
  /** When set, show per-run fence system control (if multiple products exist). */
  showProductSelect?: boolean;
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
  displayName,
  systemCode,
  summary,
  expanded,
  onToggleExpanded,
  compact = false,
  showProductSelect = false,
}: Props) {
  const { dispatch, state } = useCalculatorV4();
  const { data: products = [] } = useProducts();
  const fenceProducts = products.filter(
    (p) => p.active && p.system_type && p.system_type !== "QS_GATE",
  );
  const len = summary.totalLengthM.toFixed(2);
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

  return (
    <div className="px-4 py-3 flex items-center gap-3 border-b border-brand-border">
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
              className="shrink-0 text-brand-muted"
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

        {showProductSelect && fenceProducts.length > 1 ? (
          <div className="min-w-[10rem] max-w-[14rem]">
            <ProductSelectV4
              value={
                state.payload?.runs.find((r) => r.runId === runId)
                  ?.productCode ??
                state.payload?.productCode ??
                ""
              }
              onChange={(code) =>
                dispatch({
                  type: "SET_RUN_PRODUCT",
                  runId,
                  productCode: code,
                })
              }
            />
          </div>
        ) : (
          <Tooltip content="Fence system / product code for this run">
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-brand-accent text-brand-bg font-medium cursor-default"
              aria-label={`Fence system: ${systemCode}`}
            >
              <Tag size={ICON} className="shrink-0 opacity-90" aria-hidden />
              <span className="font-mono">{systemCode}</span>
            </span>
          </Tooltip>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stat
            icon={RulerDimensionLine}
            tooltip="Total length along this run"
            ariaLabel={`Total length along this run: ${len} metres`}
          >
            {len}m
          </Stat>

          {!compact && (
            <>
              <Stat
                icon={GalleryHorizontalEnd}
                tooltip="Number of panels"
                ariaLabel={`Panels: ${summary.panelCount}`}
                unitLabel="panels"
              >
                {summary.panelCount}
              </Stat>
              <Stat
                icon={StretchVertical}
                tooltip="Number of posts"
                ariaLabel={`Posts: ${summary.postCount}`}
                unitLabel="posts"
              >
                {summary.postCount}
              </Stat>
              <Stat
                icon={CornerDownRight}
                tooltip="Number of corners"
                ariaLabel={`Corners: ${summary.cornerCount}`}
                unitLabel="corners"
              >
                {summary.cornerCount}
              </Stat>
              <Stat
                icon={DoorOpen}
                tooltip="Number of gates"
                ariaLabel={`Gates: ${summary.gateCount}`}
                unitLabel="gates"
              >
                {summary.gateCount}
              </Stat>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
