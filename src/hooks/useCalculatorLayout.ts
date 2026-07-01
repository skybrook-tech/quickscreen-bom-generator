/**
 * useCalculatorLayout — owns all layout-related state, effects, and handlers
 * for the v3 calculator workspace. Keeps CalculatorV3Page thin.
 */

import { useState, useEffect, useCallback } from "react";
import type { RightPaneView } from "../components/calculator-v3/RightPaneTabs";
import { INITIAL_MOBILE_CALCULATOR_TAB, type MobileCalculatorTab } from "../lib/mobileShell";
import { MOBILE_BREAKPOINT } from "../lib/layoutBreakpoints";
import { initialRunPaneWidth, createInitialPayload } from "../lib/calculatorV3Helpers";
import type { CanonicalPayload } from "../types/canonical.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dispatch = React.Dispatch<any>;

interface UseCalculatorLayoutOpts {
  payload: CanonicalPayload | null;
  dispatch: Dispatch;
  setIntroDismissed: (v: boolean) => void;
  onExportCsv: () => void;
  onToggleShortcuts: () => void;
}

export interface UseCalculatorLayoutResult {
  runPaneWidth: number;
  mobileLayout: boolean;
  keyboardOffset: number;
  rightPaneView: RightPaneView;
  setRightPaneView: React.Dispatch<React.SetStateAction<RightPaneView>>;
  mapExpanded: boolean;
  setMapExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  mobileTab: MobileCalculatorTab;
  setMobileTab: React.Dispatch<React.SetStateAction<MobileCalculatorTab>>;
  handleRightPaneChange: (view: RightPaneView) => void;
  handleMobileTabChange: (tab: MobileCalculatorTab) => void;
  handleResizeStart: () => void;
}

export function useCalculatorLayout({
  payload,
  dispatch,
  setIntroDismissed,
  onExportCsv,
  onToggleShortcuts,
}: UseCalculatorLayoutOpts): UseCalculatorLayoutResult {
  const [runPaneWidth, setRunPaneWidth] = useState(initialRunPaneWidth);
  const [mobileLayout, setMobileLayout] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [rightPaneView, setRightPaneView] = useState<RightPaneView>("bom");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileCalculatorTab>(INITIAL_MOBILE_CALCULATOR_TAB);

  // Mobile layout detection
  useEffect(() => {
    const updateLayout = () => setMobileLayout(window.innerWidth < MOBILE_BREAKPOINT);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // Visual viewport keyboard offset (mobile virtual keyboard)
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateOffset = () => {
      setKeyboardOffset(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
      );
    };
    updateOffset();
    viewport.addEventListener("resize", updateOffset);
    viewport.addEventListener("scroll", updateOffset);
    return () => {
      viewport.removeEventListener("resize", updateOffset);
      viewport.removeEventListener("scroll", updateOffset);
    };
  }, []);

  // Trigger map resize when switching to map pane
  useEffect(() => {
    if (rightPaneView !== "map") return;
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  }, [rightPaneView]);

  // ESC collapses expanded map
  useEffect(() => {
    if (!mapExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapExpanded]);

  // Handle edit-gate-from-map custom event
  useEffect(() => {
    const openGateFromMap = (event: Event) => {
      const gateId = (event as CustomEvent<string>).detail;
      if (!gateId) return;
      setRightPaneView("map");
      setMapExpanded(false);
      if (mobileLayout) setMobileTab("job");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("qsbom:open-segment", { detail: gateId }));
      }, 80);
    };
    window.addEventListener("qsbom:edit-gate-from-map", openGateFromMap);
    return () => window.removeEventListener("qsbom:edit-gate-from-map", openGateFromMap);
  }, [mobileLayout]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === "?") {
        event.preventDefault();
        onToggleShortcuts();
      }
      if (mod && event.key.toLowerCase() === "e") {
        event.preventDefault();
        onExportCsv();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleRightPaneChange = useCallback((view: RightPaneView) => {
    setRightPaneView(view);
    if (view !== "map") setMapExpanded(false);
  }, []);

  const handleMobileTabChange = useCallback(
    (tab: MobileCalculatorTab) => {
      setMobileTab(tab);
      if (tab === "map") {
        if (!payload) {
          dispatch({ type: "SET_PAYLOAD", payload: createInitialPayload("QSHS") });
          dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "draw" });
        }
        setIntroDismissed(true);
        setRightPaneView("map");
        window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
        return;
      }
      setRightPaneView("bom");
      setMapExpanded(false);
    },
    [payload, dispatch, setIntroDismissed],
  );

  const handleResizeStart = useCallback(() => {
    let latestWidth = runPaneWidth;
    const onMove = (event: MouseEvent) => {
      const maxWidth = Math.min(760, window.innerWidth * 0.58);
      const minWidth = Math.min(390, Math.max(320, window.innerWidth - 360));
      latestWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, event.clientX)));
      setRunPaneWidth(latestWidth);
    };
    const onUp = () => {
      window.localStorage.setItem("qsg-run-pane-width", String(latestWidth));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [runPaneWidth]);

  return {
    runPaneWidth,
    mobileLayout,
    keyboardOffset,
    rightPaneView,
    setRightPaneView,
    mapExpanded,
    setMapExpanded,
    mobileTab,
    setMobileTab,
    handleRightPaneChange,
    handleMobileTabChange,
    handleResizeStart,
  };
}
