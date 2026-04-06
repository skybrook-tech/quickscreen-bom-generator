import { createContext, useContext, useReducer } from 'react';
import type { GateConfig } from '../schemas/gate.schema';

// ─── Actions ──────────────────────────────────────────────────────────────────

type GateAction =
  | { type: 'ADD_GATE'; gate: GateConfig }
  | { type: 'UPDATE_GATE'; id: string; updates: Partial<GateConfig> }
  | { type: 'REMOVE_GATE'; id: string }
  | { type: 'SET_GATES'; gates: GateConfig[] }
  | { type: 'CLEAR_ALL' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function gateReducer(state: GateConfig[], action: GateAction): GateConfig[] {
  switch (action.type) {
    case 'ADD_GATE':
      return [...state, action.gate];
    case 'UPDATE_GATE':
      return state.map(g => g.id === action.id ? { ...g, ...action.updates } : g);
    case 'REMOVE_GATE':
      return state.filter(g => g.id !== action.id);
    case 'SET_GATES':
      return action.gates;
    case 'CLEAR_ALL':
      return [];
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface GateContextValue {
  gates: GateConfig[];
  dispatch: React.Dispatch<GateAction>;
}

const GateContext = createContext<GateContextValue | null>(null);

interface GateProviderProps {
  children: React.ReactNode;
  initialGates?: GateConfig[];
}

export function GateProvider({ children, initialGates }: GateProviderProps) {
  const [gates, dispatch] = useReducer(gateReducer, initialGates ?? []);
  return (
    <GateContext.Provider value={{ gates, dispatch }}>
      {children}
    </GateContext.Provider>
  );
}

export function useGates() {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('useGates must be used inside GateProvider');
  return ctx;
}
