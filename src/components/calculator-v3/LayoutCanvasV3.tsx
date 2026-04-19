import { FenceLayoutCanvas } from '../canvas/FenceLayoutCanvas';
import { useCalculator } from '../../context/CalculatorContext';
import { canvasLayoutToCanonical } from '../canvas/canonicalAdapter';
import type { CanvasLayout } from '../canvas/canvasEngine';

export function LayoutCanvasV3() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;

  function handleApplied(layout: CanvasLayout) {
    if (!payload) return;
    try {
      const canonical = canvasLayoutToCanonical(
        layout,
        payload.productCode,
        payload.variables,
      );
      dispatch({ type: 'SET_PAYLOAD', payload: canonical });
    } catch {
      // canvas layout not yet valid — ignore
    }
  }

  return (
    <div className="space-y-3">
      <FenceLayoutCanvas onApplied={handleApplied} />
    </div>
  );
}
