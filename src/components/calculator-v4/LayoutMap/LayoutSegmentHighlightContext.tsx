import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type LayoutSegmentHighlight = {
  runId: string;
  segmentId: string;
} | null;

/** One-shot: expand matching SegmentRow when set from canvas segment click. */
export type PendingSegmentOpen = {
  runId: string;
  segmentId: string;
} | null;

type Ctx = {
  highlight: LayoutSegmentHighlight;
  setHighlight: (v: LayoutSegmentHighlight) => void;
  pendingOpenSegment: PendingSegmentOpen;
  requestOpenSegment: (runId: string, segmentId: string) => void;
  consumePendingOpen: () => void;
  /**
   * RunList registers this so canvas segment clicks expand the run card before
   * the segment row tries to mount (collapsed runs hide SegmentList).
   */
  setExpandRunForCanvas: (fn: ((runId: string) => void) | null) => void;
};

const LayoutSegmentHighlightContext = createContext<Ctx | null>(null);

export function LayoutSegmentHighlightProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [highlight, setHighlight] = useState<LayoutSegmentHighlight>(null);
  const [pendingOpenSegment, setPendingOpenSegment] =
    useState<PendingSegmentOpen>(null);

  const expandRunForCanvasRef = useRef<((runId: string) => void) | null>(null);

  const setExpandRunForCanvas = useCallback(
    (fn: ((runId: string) => void) | null) => {
      expandRunForCanvasRef.current = fn;
    },
    [],
  );

  const requestOpenSegment = useCallback(
    (runId: string, segmentId: string) => {
      expandRunForCanvasRef.current?.(runId);
      setHighlight({ runId, segmentId });
      setPendingOpenSegment({ runId, segmentId });
    },
    [],
  );

  const consumePendingOpen = useCallback(
    () => setPendingOpenSegment(null),
    [],
  );

  const value = useMemo(
    () => ({
      highlight,
      setHighlight,
      pendingOpenSegment,
      requestOpenSegment,
      consumePendingOpen,
      setExpandRunForCanvas,
    }),
    [
      highlight,
      pendingOpenSegment,
      requestOpenSegment,
      consumePendingOpen,
      setExpandRunForCanvas,
    ],
  );
  return (
    <LayoutSegmentHighlightContext.Provider value={value}>
      {children}
    </LayoutSegmentHighlightContext.Provider>
  );
}

/** Null when used outside LayoutSegmentHighlightProvider. */
export function useLayoutSegmentHighlight(): Ctx | null {
  return useContext(LayoutSegmentHighlightContext);
}
