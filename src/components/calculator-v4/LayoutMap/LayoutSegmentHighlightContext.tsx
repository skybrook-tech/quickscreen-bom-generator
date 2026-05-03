import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LayoutSegmentHighlight = {
  runId: string;
  segmentId: string;
} | null;

type Ctx = {
  highlight: LayoutSegmentHighlight;
  setHighlight: (v: LayoutSegmentHighlight) => void;
};

const LayoutSegmentHighlightContext = createContext<Ctx | null>(null);

export function LayoutSegmentHighlightProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [highlight, setHighlight] = useState<LayoutSegmentHighlight>(null);
  const value = useMemo(() => ({ highlight, setHighlight }), [highlight]);
  return (
    <LayoutSegmentHighlightContext.Provider value={value}>
      {children}
    </LayoutSegmentHighlightContext.Provider>
  );
}

/** Null when used outside the layout map pane — callers skip hover linking. */
export function useLayoutSegmentHighlight(): Ctx | null {
  return useContext(LayoutSegmentHighlightContext);
}
