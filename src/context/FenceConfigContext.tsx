import { createContext, useContext, useReducer } from 'react';
import { defaultFenceConfig } from '../schemas/fence.schema';
import type { FenceConfig } from '../schemas/fence.schema';

// ─── Actions ──────────────────────────────────────────────────────────────────

type FenceAction =
  | { type: 'SET_FIELD'; field: keyof FenceConfig; value: FenceConfig[keyof FenceConfig] }
  | { type: 'SET_CONFIG'; config: Partial<FenceConfig> }
  | { type: 'RESET' }
  | { type: 'LOAD_FROM_QUOTE'; config: FenceConfig };

// ─── Reducer ─────────────────────────────────────────────────────────────────

function fenceReducer(state: FenceConfig, action: FenceAction): FenceConfig {
  switch (action.type) {
    case 'SET_FIELD': {
      const next = { ...state, [action.field]: action.value };
      // XPL forces 65mm slats
      if (next.systemType === 'XPL') next.slatSize = '65';
      return next;
    }
    case 'SET_CONFIG': {
      const next = { ...state, ...action.config };
      if (next.systemType === 'XPL') next.slatSize = '65';
      return next;
    }
    case 'RESET':
      return defaultFenceConfig;
    case 'LOAD_FROM_QUOTE':
      return action.config;
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface FenceConfigContextValue {
  state: FenceConfig;
  dispatch: React.Dispatch<FenceAction>;
}

const FenceConfigContext = createContext<FenceConfigContextValue | null>(null);

interface FenceConfigProviderProps {
  children: React.ReactNode;
  initialState?: FenceConfig;
}

export function FenceConfigProvider({ children, initialState }: FenceConfigProviderProps) {
  const [state, dispatch] = useReducer(fenceReducer, initialState ?? defaultFenceConfig);
  return (
    <FenceConfigContext.Provider value={{ state, dispatch }}>
      {children}
    </FenceConfigContext.Provider>
  );
}

export function useFenceConfig() {
  const ctx = useContext(FenceConfigContext);
  if (!ctx) throw new Error('useFenceConfig must be used inside FenceConfigProvider');
  return ctx;
}
