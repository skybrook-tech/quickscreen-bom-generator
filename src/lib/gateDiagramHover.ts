import { useEffect, useState } from "react";
import type { GateDiagramNumber } from "./gateDiagramMapping";

const GATE_DIAGRAM_HOVER_EVENT = "qsbom:gate-diagram-hover";

export function setGateDiagramHover(number: GateDiagramNumber | null) {
  window.dispatchEvent(
    new CustomEvent<GateDiagramNumber | null>(GATE_DIAGRAM_HOVER_EVENT, {
      detail: number,
    }),
  );
}

export function useGateDiagramHover() {
  const [hoveredNumber, setHoveredNumber] = useState<GateDiagramNumber | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      setHoveredNumber((event as CustomEvent<GateDiagramNumber | null>).detail ?? null);
    };
    window.addEventListener(GATE_DIAGRAM_HOVER_EVENT, handler);
    return () => window.removeEventListener(GATE_DIAGRAM_HOVER_EVENT, handler);
  }, []);

  return hoveredNumber;
}
