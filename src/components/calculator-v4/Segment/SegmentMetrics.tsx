import { Tooltip } from "../../ui/Tooltip";
import { GalleryHorizontalEnd, Fence } from "lucide-react";

const METRIC_ICON = 14;

interface SegmentMetricsProps {
  segmentMetrics: {
    panels: number;
    posts: number;
  };
}

const SegmentMetrics = ({ segmentMetrics }: SegmentMetricsProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Tooltip content="Panel bays in this segment (from span width ÷ max panel width)">
          <span
            className="inline-flex items-center gap-0.5 cursor-default text-xs tabular-nums"
            aria-label={`Panels in this segment: ${segmentMetrics.panels}`}
          >
            <GalleryHorizontalEnd
              size={METRIC_ICON}
              className="shrink-0 opacity-90"
              aria-hidden
            />
            <span className="font-mono">{segmentMetrics.panels}</span>
            <span className="hidden sm:inline text-[11px]">panels</span>
          </span>
        </Tooltip>
        <Tooltip content="Estimated posts for this segment (panel bays + ends)">
          <span
            className="inline-flex items-center gap-0.5 cursor-default text-xs tabular-nums"
            aria-label={`Estimated posts for this segment: ${segmentMetrics.posts}`}
          >
            <Fence
              size={METRIC_ICON}
              className="shrink-0 opacity-90"
              aria-hidden
            />
            <span className="font-mono">{segmentMetrics.posts}</span>
            <span className="hidden sm:inline text-[11px]">posts</span>
          </span>
        </Tooltip>
      </div>
    </div>
  );
};

export default SegmentMetrics;
