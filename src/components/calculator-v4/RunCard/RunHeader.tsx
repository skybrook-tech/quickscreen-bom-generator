import type { RunSummary } from "./useRunSummary";

interface Props {
  index: number;
  systemCode: string;
  summary: RunSummary;
}

export function RunHeader({ index, systemCode, summary }: Props) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-1">
        <h2 className="font-semibold text-base">Run {index}</h2>
        <span className="text-xs px-2 py-0.5 rounded-md bg-brand-accent text-brand-bg font-medium">
          {systemCode}
        </span>
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-neutral-400 font-mono tabular-nums">
          <span>{summary.totalLengthM.toFixed(2)}m total</span>
          <span>·</span>
          <span>{summary.actualHeightMm}mm actual</span>
          <span>·</span>
          <span>{summary.segmentCount} seg</span>
          <span>·</span>
          <span>{summary.panelCount} panels</span>
          <span>·</span>
          <span>{summary.postCount} posts</span>
          <span>·</span>
          <span>{summary.cornerCount} corners</span>
        </div>
      </div>
    </div>
  );
}
