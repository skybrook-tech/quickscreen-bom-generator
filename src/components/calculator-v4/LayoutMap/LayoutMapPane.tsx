import { RunList } from "../RunCard/RunList";
import { SlideOutPane } from "../shared/SlideOutPane";
import { FenceLayoutCanvasV4 } from "./FenceLayoutCanvasV4";
import { LayoutSegmentHighlightProvider } from "./LayoutSegmentHighlightContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddGate: (runId: string) => void;
}

/**
 * Slide-out pane housing the layout map (canvas).
 * Uses the existing canvasEngine.ts utility (vanilla TS port — see CLAUDE.md §8)
 * via FenceLayoutCanvasV4 wrapper.
 */
export function LayoutMapPane({ open, onClose, onAddGate }: Props) {
  return (
    <SlideOutPane
      open={open}
      onClose={onClose}
      title="Layout map"
      widthClass="md:w-[95%]"
    >
      <LayoutSegmentHighlightProvider>
        <div className="flex h-full min-h-0 gap-4 p-4">
          <div className="flex w-[35%] shrink-0 flex-col overflow-y-auto min-h-0">
            <RunList onAddGate={onAddGate} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <FenceLayoutCanvasV4 />
          </div>
        </div>
      </LayoutSegmentHighlightProvider>
    </SlideOutPane>
  );
}
