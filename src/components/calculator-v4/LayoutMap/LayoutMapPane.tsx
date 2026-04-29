import { SlideOutPane } from "../shared/SlideOutPane";
import { FenceLayoutCanvasV4 } from "./FenceLayoutCanvasV4";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Slide-out pane housing the layout map (canvas).
 * Uses the existing canvasEngine.ts utility (vanilla TS port — see CLAUDE.md §8)
 * via FenceLayoutCanvasV4 wrapper.
 */
export function LayoutMapPane({ open, onClose }: Props) {
  return (
    <SlideOutPane
      open={open}
      onClose={onClose}
      title="Layout map"
      subtitle="Draw your fence; segments stay in sync with the form."
      widthClass="md:w-[60%]"
    >
      <FenceLayoutCanvasV4 />
    </SlideOutPane>
  );
}
