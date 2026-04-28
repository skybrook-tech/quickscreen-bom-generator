import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ColourOption {
  value: string;
  label: string;
  finish_group: string;
  limited: boolean;
  sort_order: number;
}

// Hardcoded placeholder used while the DB query is in-flight so the colour
// select is never empty on initial render. Replaced by DB data once loaded.
const COLOUR_PLACEHOLDER: ColourOption[] = [
  { value: 'black-satin',            label: 'Black Satin',                   finish_group: 'standard',  limited: false, sort_order: 10  },
  { value: 'monument-matt',          label: 'Monument Matt',                 finish_group: 'standard',  limited: false, sort_order: 20  },
  { value: 'woodland-grey-matt',     label: 'Woodland Grey Matt',            finish_group: 'standard',  limited: false, sort_order: 30  },
  { value: 'surfmist-matt',          label: 'Surfmist Matt',                 finish_group: 'standard',  limited: false, sort_order: 40  },
  { value: 'pearl-white-gloss',      label: 'Pearl White Gloss',             finish_group: 'standard',  limited: false, sort_order: 50  },
  { value: 'basalt-satin',           label: 'Basalt Satin',                  finish_group: 'standard',  limited: false, sort_order: 60  },
  { value: 'dune-satin',             label: 'Dune Satin',                    finish_group: 'standard',  limited: false, sort_order: 70  },
  { value: 'mill',                   label: 'Mill (raw aluminium)',          finish_group: 'standard',  limited: false, sort_order: 80  },
  { value: 'primrose',               label: 'Primrose',                      finish_group: 'standard',  limited: true,  sort_order: 90  },
  { value: 'paperbark',              label: 'Paperbark',                     finish_group: 'standard',  limited: true,  sort_order: 100 },
  { value: 'palladium-silver-pearl', label: 'Palladium Silver Pearl',        finish_group: 'standard',  limited: false, sort_order: 110 },
  { value: 'kwila',                  label: 'Kwila (Alumawood)',             finish_group: 'alumawood', limited: false, sort_order: 120 },
  { value: 'western-red-cedar',      label: 'Western Red Cedar (Alumawood)', finish_group: 'alumawood', limited: false, sort_order: 130 },
  { value: 'island-grey',            label: 'Island Grey (Alumawood)',       finish_group: 'alumawood', limited: false, sort_order: 140 },
];

export function useColourOptions() {
  return useQuery<ColourOption[]>({
    queryKey: ['colour-options'],
    staleTime: 30 * 60_000,
    placeholderData: COLOUR_PLACEHOLDER,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colour_options')
        .select('value, label, finish_group, limited, sort_order')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}
