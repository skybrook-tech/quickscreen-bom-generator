import type { LucideIcon } from "lucide-react";
import {
  StretchVertical,
  GalleryHorizontalEnd,
  CornerDownRight,
  Route,
  Tag,
  RulerDimensionLine,
  DoorOpen,
} from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "../../ui/Tooltip";
import type { RunSummary } from "./useRunSummary";
import { cn } from "../../../lib";

interface Props {
  index: number;
  systemCode: string;
  summary: RunSummary;
}

const ICON = 12;

function Stat({
  icon: Icon,
  tooltip,
  ariaLabel,
  children,
  className,
}: {
  icon: LucideIcon;
  tooltip: string;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip content={tooltip}>
      <span
        className="inline-flex items-center gap-1 cursor-default text-xs text-neutral-600"
        aria-label={ariaLabel}
      >
        <Icon
          size={ICON}
          className={cn("shrink-0 text-neutral-500", className)}
          aria-hidden
        />
        <span className="font-mono tabular-nums">{children}</span>
      </span>
    </Tooltip>
  );
}

export function RunHeader({ index, systemCode, summary }: Props) {
  const len = summary.totalLengthM.toFixed(2);

  return (
    <div className="px-4 py-3 flex items-center gap-3 border-b border-brand-border">
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-3 gap-y-1">
        <Tooltip content="Fence run — one continuous layout group on this job">
          <h2
            className="font-semibold text-base inline-flex items-center gap-1.5 cursor-default"
            aria-label={`Fence run ${index}`}
          >
            <Route
              size={16}
              className="shrink-0 text-neutral-500"
              aria-hidden
            />
            <span className="font-mono tabular-nums">{index}</span>
          </h2>
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
          <Stat
            icon={RulerDimensionLine}
            tooltip="Total length along this run"
            ariaLabel={`Total length along this run: ${len} metres`}
          >
            {len}m
          </Stat>

          <Stat
            icon={GalleryHorizontalEnd}
            tooltip="Number of panels"
            ariaLabel={`Panels: ${summary.panelCount}`}
          >
            {summary.panelCount}
          </Stat>
          <Stat
            icon={StretchVertical}
            tooltip="Number of posts"
            ariaLabel={`Posts: ${summary.postCount}`}
          >
            {summary.postCount}
          </Stat>
          <Stat
            icon={CornerDownRight}
            tooltip="Number of corners"
            ariaLabel={`Corners: ${summary.cornerCount}`}
          >
            {summary.cornerCount}
          </Stat>
          <Stat
            icon={DoorOpen}
            tooltip="Number of gates"
            ariaLabel={`Gates: ${summary.gateCount}`}
          >
            {summary.gateCount}
          </Stat>
        </div>
      </div>
    </div>
  );
}
